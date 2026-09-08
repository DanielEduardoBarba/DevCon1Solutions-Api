import { FieldValue } from "firebase-admin/firestore"
import { db, toDate } from "../db/firebase.js"
import type { ApiKeyRecord } from "../db/types.js"

const COLLECTION = "api_keys"

function mapKey(id: string, data: Record<string, unknown>): ApiKeyRecord {
  return {
    id,
    name: String(data.name || ""),
    prefix: String(data.prefix || ""),
    keyHash: String(data.keyHash || ""),
    active: data.active !== false,
    deliverTo: data.deliverTo ? String(data.deliverTo) : null,
    brandName: data.brandName ? String(data.brandName) : null,
    brandUrl: data.brandUrl ? String(data.brandUrl) : null,
    sendNotification: data.sendNotification !== false,
    sendConfirmation: data.sendConfirmation !== false,
    allowOverrides: data.allowOverrides !== false,
    notificationTemplateId: data.notificationTemplateId
      ? String(data.notificationTemplateId)
      : null,
    confirmationTemplateId: data.confirmationTemplateId
      ? String(data.confirmationTemplateId)
      : null,
    notes: String(data.notes || ""),
    lastUsedAt: toDate(data.lastUsedAt),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

export async function listApiKeys(): Promise<ApiKeyRecord[]> {
  const snap = await db().collection(COLLECTION).get()
  return snap.docs
    .map((d) => mapKey(d.id, d.data()))
    .sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    )
}

export async function findActiveApiKeyByHash(
  keyHash: string
): Promise<ApiKeyRecord | null> {
  // Prefer single-field query; filter active in memory to avoid composite indexes
  const snap = await db()
    .collection(COLLECTION)
    .where("keyHash", "==", keyHash)
    .limit(5)
    .get()
  for (const doc of snap.docs) {
    const row = mapKey(doc.id, doc.data())
    if (row.active) return row
  }
  return null
}

export async function findApiKeyByHash(
  keyHash: string
): Promise<ApiKeyRecord | null> {
  const snap = await db()
    .collection(COLLECTION)
    .where("keyHash", "==", keyHash)
    .limit(1)
    .get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  return mapKey(doc.id, doc.data())
}

export async function getApiKeyById(id: string): Promise<ApiKeyRecord | null> {
  const snap = await db().collection(COLLECTION).doc(id).get()
  if (!snap.exists) return null
  return mapKey(snap.id, snap.data()!)
}

export async function createApiKey(input: {
  name: string
  prefix: string
  keyHash: string
  deliverTo?: string | null
  brandName?: string | null
  brandUrl?: string | null
  sendNotification?: boolean
  sendConfirmation?: boolean
  allowOverrides?: boolean
  notificationTemplateId?: string | null
  confirmationTemplateId?: string | null
  notes?: string
}): Promise<ApiKeyRecord> {
  const ref = db().collection(COLLECTION).doc()
  const payload = {
    name: input.name,
    prefix: input.prefix,
    keyHash: input.keyHash,
    active: true,
    deliverTo: input.deliverTo || null,
    brandName: input.brandName || null,
    brandUrl: input.brandUrl || null,
    sendNotification: input.sendNotification ?? true,
    sendConfirmation: input.sendConfirmation ?? true,
    allowOverrides: input.allowOverrides ?? true,
    notificationTemplateId: input.notificationTemplateId || null,
    confirmationTemplateId: input.confirmationTemplateId || null,
    notes: input.notes || "",
    lastUsedAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }
  await ref.set(payload)
  const created = await ref.get()
  return mapKey(created.id, created.data()!)
}

export async function updateApiKey(
  id: string,
  patch: Partial<{
    name: string
    active: boolean
    deliverTo: string | null
    brandName: string | null
    brandUrl: string | null
    sendNotification: boolean
    sendConfirmation: boolean
    allowOverrides: boolean
    notificationTemplateId: string | null
    confirmationTemplateId: string | null
    notes: string
    lastUsedAt: Date | null
  }>
): Promise<ApiKeyRecord | null> {
  const ref = db().collection(COLLECTION).doc(id)
  const snap = await ref.get()
  if (!snap.exists) return null
  await ref.update({
    ...patch,
    updatedAt: FieldValue.serverTimestamp(),
  })
  const updated = await ref.get()
  return mapKey(updated.id, updated.data()!)
}

export async function deleteApiKey(id: string): Promise<boolean> {
  const ref = db().collection(COLLECTION).doc(id)
  const snap = await ref.get()
  if (!snap.exists) return false
  await ref.delete()
  return true
}

export async function touchApiKeyLastUsed(id: string): Promise<void> {
  await db()
    .collection(COLLECTION)
    .doc(id)
    .update({
      lastUsedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
}
