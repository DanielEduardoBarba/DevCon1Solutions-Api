import type { Request, Response, NextFunction } from "express"
import { sha256 } from "../utils/crypto.js"
import type { ApiKeyRecord } from "../db/types.js"
import * as apiKeysRepo from "../repos/apiKeys.js"
import { verifyToken, type SessionClaims } from "../services/auth.js"

export type AuthedRequest = Request & {
  adminId?: string
  adminEmail?: string
  apiKey?: ApiKeyRecord
}

export function extractApiKey(req: Request): string | null {
  const header = req.header("x-api-key") || req.header("X-API-Key")
  if (header?.trim()) return header.trim()

  const auth = req.header("authorization") || req.header("Authorization")
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim()
  }

  const body = req.body as { key?: string; apiKey?: string } | undefined
  if (body?.key) return String(body.key).trim()
  if (body?.apiKey) return String(body.apiKey).trim()

  return null
}

export async function requireApiKey(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const raw = extractApiKey(req)
    if (!raw) {
      res.status(401).json({ error: "Missing API key", response: "Not AUTHORIZED!" })
      return
    }
    const doc = await apiKeysRepo.findActiveApiKeyByHash(sha256(raw))
    if (!doc) {
      res.status(401).json({ error: "Invalid API key", response: "Not AUTHORIZED!" })
      return
    }
    await apiKeysRepo.touchApiKeyLastUsed(doc.id)
    req.apiKey = doc
    next()
  } catch (err) {
    next(err)
  }
}

export function requireAdminSession(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const auth = req.header("authorization") || ""
    const token = auth.toLowerCase().startsWith("bearer ")
      ? auth.slice(7).trim()
      : ""
    if (!token) {
      res.status(401).json({ error: "Missing session token" })
      return
    }
    const claims = verifyToken<SessionClaims>(token)
    if (claims.typ !== "session") {
      res.status(401).json({ error: "Invalid session" })
      return
    }
    req.adminId = claims.sub
    req.adminEmail = claims.email
    next()
  } catch {
    res.status(401).json({ error: "Session expired or invalid" })
  }
}

export function asyncHandler(
  fn: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AuthedRequest, res, next)).catch(next)
  }
}
