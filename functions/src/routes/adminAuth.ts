import { Router } from "express"
import { z } from "zod"
import {
  asyncHandler,
  requireAdminSession,
  type AuthedRequest,
} from "../middleware/auth.js"
import {
  beginTotpSetup,
  changePassword,
  disableMfa,
  enableEmailMfa,
  enableTotp,
  getAdminPublic,
  isSetupComplete,
  issueEmailOtp,
  loginWithPassword,
  setupAdmin,
  updateAdminEmail,
  verifyMfa,
  verifyToken,
  type PendingMfaClaims,
} from "../services/auth.js"

const router = Router()

router.get(
  "/status",
  asyncHandler(async (_req, res) => {
    const setupRequired = !(await isSetupComplete())
    res.json({ setupRequired })
  })
)

router.post(
  "/setup",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(10),
      })
      .parse(req.body)
    const result = await setupAdmin(body.email, body.password)
    res.status(201).json(result)
  })
)

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = z.object({ password: z.string().min(1) }).parse(req.body)
    const result = await loginWithPassword(body.password)
    res.json(result)
  })
)

router.post(
  "/mfa/verify",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        pendingToken: z.string().min(1),
        code: z.string().min(4),
      })
      .parse(req.body)
    const result = await verifyMfa(body.pendingToken, body.code)
    res.json(result)
  })
)

router.post(
  "/mfa/email/resend",
  asyncHandler(async (req, res) => {
    const body = z.object({ pendingToken: z.string().min(1) }).parse(req.body)
    let claims: PendingMfaClaims
    try {
      claims = verifyToken<PendingMfaClaims>(body.pendingToken)
    } catch {
      res.status(401).json({ error: "MFA session expired" })
      return
    }
    if (claims.typ !== "mfa_pending") {
      res.status(401).json({ error: "Invalid MFA token" })
      return
    }
    await issueEmailOtp(claims.sub, claims.email)
    res.json({ ok: true })
  })
)

router.get(
  "/me",
  requireAdminSession,
  asyncHandler(async (req: AuthedRequest, res) => {
    const admin = await getAdminPublic(req.adminId!)
    if (!admin) {
      res.status(404).json({ error: "Admin not found" })
      return
    }
    res.json({ admin })
  })
)

router.post(
  "/password",
  requireAdminSession,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = z
      .object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(10),
      })
      .parse(req.body)
    await changePassword(req.adminId!, body.currentPassword, body.newPassword)
    res.json({ ok: true })
  })
)

router.post(
  "/mfa/totp/setup",
  requireAdminSession,
  asyncHandler(async (req: AuthedRequest, res) => {
    const result = await beginTotpSetup(req.adminId!)
    res.json(result)
  })
)

router.post(
  "/mfa/totp/enable",
  requireAdminSession,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = z.object({ code: z.string().min(4) }).parse(req.body)
    const result = await enableTotp(req.adminId!, body.code)
    res.json(result)
  })
)

router.post(
  "/mfa/email/enable",
  requireAdminSession,
  asyncHandler(async (req: AuthedRequest, res) => {
    const result = await enableEmailMfa(req.adminId!)
    res.json(result)
  })
)

router.post(
  "/mfa/disable",
  requireAdminSession,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = z.object({ password: z.string().min(1) }).parse(req.body)
    const result = await disableMfa(req.adminId!, body.password)
    res.json(result)
  })
)

router.patch(
  "/email",
  requireAdminSession,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = z.object({ email: z.string().email() }).parse(req.body)
    const result = await updateAdminEmail(req.adminId!, body.email)
    res.json(result)
  })
)

export default router
