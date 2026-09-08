import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"
import { env } from "../config/env.js"

const ALGO = "aes-256-gcm"

function keyBytes(): Buffer {
  // Derive a stable 32-byte key from ENCRYPTION_KEY (any length string ok)
  return createHash("sha256").update(env.encryptionKey).digest()
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, keyBytes(), iv)
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`
}

export function decryptSecret(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(":")
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted secret format")
  }
  const decipher = createDecipheriv(ALGO, keyBytes(), Buffer.from(ivB64, "base64"))
  decipher.setAuthTag(Buffer.from(tagB64, "base64"))
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ])
  return dec.toString("utf8")
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = `dc1_${randomBytes(24).toString("base64url")}`
  const prefix = raw.slice(0, 12)
  return { raw, prefix, hash: sha256(raw) }
}

export function generateOtpCode(length = 6): string {
  const max = 10 ** length
  const n = randomBytes(4).readUInt32BE(0) % max
  return String(n).padStart(length, "0")
}
