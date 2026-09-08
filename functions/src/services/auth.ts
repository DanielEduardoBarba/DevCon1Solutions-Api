import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { authenticator } from "otplib"
import QRCode from "qrcode"
import { env } from "../config/env.js"
import { decryptSecret, encryptSecret, generateOtpCode, sha256 } from "../utils/crypto.js"
import * as adminRepo from "../repos/admin.js"
import * as mfaRepo from "../repos/mfa.js"
import { sendMail, getResolvedMailContext } from "./mailer.js"

authenticator.options = { window: 1 }

export type SessionClaims = {
  sub: string
  email: string
  typ: "session"
}

export type PendingMfaClaims = {
  sub: string
  email: string
  typ: "mfa_pending"
}

function sign(payload: object, expiresIn: string): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn } as jwt.SignOptions)
}

export function verifyToken<T extends object>(token: string): T {
  return jwt.verify(token, env.jwtSecret) as T
}

export async function isSetupComplete(): Promise<boolean> {
  return adminRepo.adminExists()
}

export async function setupAdmin(email: string, password: string) {
  if (await isSetupComplete()) {
    throw Object.assign(new Error("Admin already configured"), { status: 409 })
  }
  if (!email || !password || password.length < 10) {
    throw Object.assign(
      new Error("Email and password (min 10 chars) are required"),
      { status: 400 }
    )
  }
  const passwordHash = await bcrypt.hash(password, 12)
  const admin = await adminRepo.createPrimaryAdmin({
    email: email.toLowerCase().trim(),
    passwordHash,
  })
  const token = sign(
    { sub: admin.id, email: admin.email, typ: "session" } satisfies SessionClaims,
    env.jwtExpiresIn
  )
  return {
    token,
    admin: { email: admin.email, mfaEnabled: false, mfaMethod: null },
  }
}

export async function loginWithPassword(password: string) {
  const admin = await adminRepo.getPrimaryAdmin()
  if (!admin) {
    throw Object.assign(new Error("Admin not configured"), { status: 404 })
  }
  const ok = await bcrypt.compare(password, admin.passwordHash)
  if (!ok) {
    throw Object.assign(new Error("Invalid password"), { status: 401 })
  }

  if (admin.mfaEnabled && admin.mfaMethod) {
    const pendingToken = sign(
      {
        sub: admin.id,
        email: admin.email,
        typ: "mfa_pending",
      } satisfies PendingMfaClaims,
      env.mfaPendingExpiresIn
    )

    if (admin.mfaMethod === "email") {
      await issueEmailOtp(admin.id, admin.email)
    }

    return {
      requiresMfa: true as const,
      mfaMethod: admin.mfaMethod,
      pendingToken,
      emailHint: maskEmail(admin.email),
    }
  }

  const token = sign(
    { sub: admin.id, email: admin.email, typ: "session" } satisfies SessionClaims,
    env.jwtExpiresIn
  )
  return {
    requiresMfa: false as const,
    token,
    admin: {
      email: admin.email,
      mfaEnabled: admin.mfaEnabled,
      mfaMethod: admin.mfaMethod || null,
    },
  }
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@")
  if (!domain) return "***"
  const visible = user.slice(0, 2)
  return `${visible}***@${domain}`
}

export async function issueEmailOtp(adminId: string, email: string) {
  const code = generateOtpCode(6)
  await mfaRepo.clearMfaChallenges(adminId)
  await mfaRepo.createMfaChallenge({
    adminId,
    codeHash: sha256(code),
    expiresAt: new Date(Date.now() + env.emailOtpTtlSeconds * 1000),
  })

  const ctx = await getResolvedMailContext()
  await sendMail({
    from: ctx.fromAddress,
    to: email,
    subject: `${ctx.brand.name} console MFA code`,
    text: `Your Devcon1 console verification code is: ${code}\n\nIt expires in ${Math.floor(env.emailOtpTtlSeconds / 60)} minutes.`,
    html: `<p>Your Devcon1 console verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:0.2em;">${code}</p><p>It expires in ${Math.floor(env.emailOtpTtlSeconds / 60)} minutes.</p>`,
  })
}

export async function verifyMfa(pendingToken: string, code: string) {
  let claims: PendingMfaClaims
  try {
    claims = verifyToken<PendingMfaClaims>(pendingToken)
  } catch {
    throw Object.assign(new Error("MFA session expired"), { status: 401 })
  }
  if (claims.typ !== "mfa_pending") {
    throw Object.assign(new Error("Invalid MFA token"), { status: 401 })
  }

  const admin = await adminRepo.getAdminById(claims.sub)
  if (!admin || !admin.mfaEnabled) {
    throw Object.assign(new Error("MFA not enabled"), { status: 400 })
  }

  let valid = false
  if (admin.mfaMethod === "totp") {
    if (!admin.totpSecretEncrypted) {
      throw Object.assign(new Error("TOTP not configured"), { status: 400 })
    }
    const secret = decryptSecret(admin.totpSecretEncrypted)
    valid = authenticator.verify({ token: code.replace(/\s/g, ""), secret })
  } else if (admin.mfaMethod === "email") {
    const challenge = await mfaRepo.findLatestValidMfaChallenge(admin.id)
    if (challenge && challenge.codeHash === sha256(code.trim())) {
      await mfaRepo.consumeMfaChallenge(challenge.id)
      valid = true
    }
  }

  if (!valid) {
    throw Object.assign(new Error("Invalid MFA code"), { status: 401 })
  }

  const token = sign(
    { sub: admin.id, email: admin.email, typ: "session" } satisfies SessionClaims,
    env.jwtExpiresIn
  )
  return {
    token,
    admin: {
      email: admin.email,
      mfaEnabled: admin.mfaEnabled,
      mfaMethod: admin.mfaMethod || null,
    },
  }
}

export async function changePassword(
  adminId: string,
  currentPassword: string,
  newPassword: string
) {
  if (!newPassword || newPassword.length < 10) {
    throw Object.assign(new Error("New password must be at least 10 characters"), {
      status: 400,
    })
  }
  const admin = await adminRepo.getAdminById(adminId)
  if (!admin) throw Object.assign(new Error("Not found"), { status: 404 })
  const ok = await bcrypt.compare(currentPassword, admin.passwordHash)
  if (!ok) throw Object.assign(new Error("Current password is incorrect"), { status: 401 })
  await adminRepo.updateAdmin(adminId, {
    passwordHash: await bcrypt.hash(newPassword, 12),
  })
}

export async function beginTotpSetup(adminId: string) {
  const admin = await adminRepo.getAdminById(adminId)
  if (!admin) throw Object.assign(new Error("Not found"), { status: 404 })
  const secret = authenticator.generateSecret()
  const otpauth = authenticator.keyuri(admin.email, "Devcon1 Console", secret)
  const qrDataUrl = await QRCode.toDataURL(otpauth)
  await adminRepo.updateAdmin(adminId, {
    totpSecretEncrypted: encryptSecret(secret),
  })
  return { secret, otpauth, qrDataUrl }
}

export async function enableTotp(adminId: string, code: string) {
  const admin = await adminRepo.getAdminById(adminId)
  if (!admin?.totpSecretEncrypted) {
    throw Object.assign(new Error("Start TOTP setup first"), { status: 400 })
  }
  const secret = decryptSecret(admin.totpSecretEncrypted)
  const valid = authenticator.verify({ token: code.replace(/\s/g, ""), secret })
  if (!valid) {
    throw Object.assign(new Error("Invalid TOTP code"), { status: 400 })
  }
  await adminRepo.updateAdmin(adminId, {
    mfaEnabled: true,
    mfaMethod: "totp",
  })
  return { mfaEnabled: true, mfaMethod: "totp" as const }
}

export async function enableEmailMfa(adminId: string) {
  const admin = await adminRepo.getAdminById(adminId)
  if (!admin) throw Object.assign(new Error("Not found"), { status: 404 })
  await adminRepo.updateAdmin(adminId, {
    mfaEnabled: true,
    mfaMethod: "email",
    totpSecretEncrypted: null,
  })
  return { mfaEnabled: true, mfaMethod: "email" as const }
}

export async function disableMfa(adminId: string, password: string) {
  const admin = await adminRepo.getAdminById(adminId)
  if (!admin) throw Object.assign(new Error("Not found"), { status: 404 })
  const ok = await bcrypt.compare(password, admin.passwordHash)
  if (!ok) throw Object.assign(new Error("Invalid password"), { status: 401 })
  await adminRepo.updateAdmin(adminId, {
    mfaEnabled: false,
    mfaMethod: null,
    totpSecretEncrypted: null,
  })
  return { mfaEnabled: false, mfaMethod: null }
}

export async function getAdminPublic(adminId: string) {
  const admin = await adminRepo.getAdminById(adminId)
  if (!admin) return null
  return {
    email: admin.email,
    mfaEnabled: admin.mfaEnabled,
    mfaMethod: admin.mfaMethod || null,
  }
}

export async function updateAdminEmail(adminId: string, email: string) {
  const updated = await adminRepo.updateAdmin(adminId, {
    email: email.toLowerCase().trim(),
  })
  if (!updated) throw Object.assign(new Error("Not found"), { status: 404 })
  return { email: updated.email }
}
