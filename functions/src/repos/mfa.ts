import { FieldValue } from "firebase-admin/firestore"
import { db, toDate } from "../db/firebase.js"
import type { MfaChallengeRecord } from "../db/types.js"

const COLLECTION = "mfa_challenges"

function mapChallenge(
  id: string,
  data: Record<string, unknown>
): MfaChallengeRecord {
  return {
    id,
    adminId: String(data.adminId || ""),
    codeHash: String(data.codeHash || ""),
    expiresAt: toDate(data.expiresAt) || new Date(0),
    consumed: Boolean(data.consumed),
    createdAt: toDate(data.createdAt),
  }
}

export async function clearMfaChallenges(adminId: string): Promise<void> {
  const snap = await db()
    .collection(COLLECTION)
    .where("adminId", "==", adminId)
    .get()
  const batch = db().batch()
  snap.docs.forEach((doc) => batch.delete(doc.ref))
  if (!snap.empty) await batch.commit()
}

export async function createMfaChallenge(input: {
  adminId: string
  codeHash: string
  expiresAt: Date
}): Promise<MfaChallengeRecord> {
  const ref = db().collection(COLLECTION).doc()
  await ref.set({
    adminId: input.adminId,
    codeHash: input.codeHash,
    expiresAt: input.expiresAt,
    consumed: false,
    createdAt: FieldValue.serverTimestamp(),
  })
  const created = await ref.get()
  return mapChallenge(created.id, created.data()!)
}

export async function findLatestValidMfaChallenge(
  adminId: string
): Promise<MfaChallengeRecord | null> {
  // Single-field query to avoid composite index requirements
  const snap = await db()
    .collection(COLLECTION)
    .where("adminId", "==", adminId)
    .get()

  const now = Date.now()
  const valid = snap.docs
    .map((doc) => mapChallenge(doc.id, doc.data()))
    .filter((row) => !row.consumed && row.expiresAt.getTime() > now)
    .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))

  return valid[0] || null
}

export async function consumeMfaChallenge(id: string): Promise<void> {
  await db().collection(COLLECTION).doc(id).update({ consumed: true })
}
