import { FieldValue } from "firebase-admin/firestore"
import { db, toDate } from "../db/firebase.js"
import type { AdminRecord } from "../db/types.js"

const COLLECTION = "console_admin"
const PRIMARY_ID = "primary"

function mapAdmin(id: string, data: Record<string, unknown>): AdminRecord {
  return {
    id,
    email: String(data.email || ""),
    passwordHash: String(data.passwordHash || ""),
    mfaEnabled: Boolean(data.mfaEnabled),
    mfaMethod: (data.mfaMethod as AdminRecord["mfaMethod"]) || null,
    totpSecretEncrypted: data.totpSecretEncrypted
      ? String(data.totpSecretEncrypted)
      : null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

export async function adminExists(): Promise<boolean> {
  const snap = await db().collection(COLLECTION).limit(1).get()
  return !snap.empty
}

export async function getPrimaryAdmin(): Promise<AdminRecord | null> {
  const primary = await db().collection(COLLECTION).doc(PRIMARY_ID).get()
  if (primary.exists) return mapAdmin(primary.id, primary.data()!)

  const snap = await db().collection(COLLECTION).limit(1).get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  return mapAdmin(doc.id, doc.data())
}

export async function getAdminById(id: string): Promise<AdminRecord | null> {
  const snap = await db().collection(COLLECTION).doc(id).get()
  if (!snap.exists) return null
  return mapAdmin(snap.id, snap.data()!)
}

export async function createPrimaryAdmin(input: {
  email: string
  passwordHash: string
}): Promise<AdminRecord> {
  const ref = db().collection(COLLECTION).doc(PRIMARY_ID)
  const payload = {
    email: input.email,
    passwordHash: input.passwordHash,
    mfaEnabled: false,
    mfaMethod: null,
    totpSecretEncrypted: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }
  await ref.set(payload)
  const created = await ref.get()
  return mapAdmin(created.id, created.data()!)
}

export async function updateAdmin(
  id: string,
  patch: Partial<{
    email: string
    passwordHash: string
    mfaEnabled: boolean
    mfaMethod: "totp" | "email" | null
    totpSecretEncrypted: string | null
  }>
): Promise<AdminRecord | null> {
  const ref = db().collection(COLLECTION).doc(id)
  const snap = await ref.get()
  if (!snap.exists) return null
  await ref.update({
    ...patch,
    updatedAt: FieldValue.serverTimestamp(),
  })
  const updated = await ref.get()
  return mapAdmin(updated.id, updated.data()!)
}
