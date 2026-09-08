import { FieldValue } from "firebase-admin/firestore"
import { db, toDate } from "../db/firebase.js"
import type { EmailTemplateRecord } from "../db/types.js"

const COLLECTION = "email_templates"

function mapTemplate(
  id: string,
  data: Record<string, unknown>
): EmailTemplateRecord {
  return {
    id,
    name: String(data.name || ""),
    slug: String(data.slug || ""),
    type: data.type as EmailTemplateRecord["type"],
    subjectTemplate: String(data.subjectTemplate || ""),
    htmlTemplate: String(data.htmlTemplate || ""),
    textTemplate: String(data.textTemplate || ""),
    description: String(data.description || ""),
    isSystemDefault: Boolean(data.isSystemDefault),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

export async function listTemplates(): Promise<EmailTemplateRecord[]> {
  const snap = await db().collection(COLLECTION).get()
  const rows = snap.docs.map((d) => mapTemplate(d.id, d.data()))
  return rows.sort((a, b) => {
    const t = a.type.localeCompare(b.type)
    if (t !== 0) return t
    return a.name.localeCompare(b.name)
  })
}

export async function getTemplateById(
  id: string
): Promise<EmailTemplateRecord | null> {
  const snap = await db().collection(COLLECTION).doc(id).get()
  if (!snap.exists) return null
  return mapTemplate(snap.id, snap.data()!)
}

export async function getTemplateBySlug(
  slug: string
): Promise<EmailTemplateRecord | null> {
  const snap = await db()
    .collection(COLLECTION)
    .where("slug", "==", slug)
    .limit(1)
    .get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  return mapTemplate(doc.id, doc.data())
}

export async function createTemplate(input: {
  name: string
  slug: string
  type: EmailTemplateRecord["type"]
  subjectTemplate: string
  htmlTemplate: string
  textTemplate?: string
  description?: string
  isSystemDefault?: boolean
}): Promise<EmailTemplateRecord> {
  const ref = db().collection(COLLECTION).doc()
  await ref.set({
    name: input.name,
    slug: input.slug,
    type: input.type,
    subjectTemplate: input.subjectTemplate,
    htmlTemplate: input.htmlTemplate,
    textTemplate: input.textTemplate || "",
    description: input.description || "",
    isSystemDefault: input.isSystemDefault ?? false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
  const created = await ref.get()
  return mapTemplate(created.id, created.data()!)
}

export async function updateTemplate(
  id: string,
  patch: Partial<{
    name: string
    slug: string
    type: EmailTemplateRecord["type"]
    subjectTemplate: string
    htmlTemplate: string
    textTemplate: string
    description: string
  }>
): Promise<EmailTemplateRecord | null> {
  const ref = db().collection(COLLECTION).doc(id)
  const snap = await ref.get()
  if (!snap.exists) return null
  await ref.update({
    ...patch,
    updatedAt: FieldValue.serverTimestamp(),
  })
  const updated = await ref.get()
  return mapTemplate(updated.id, updated.data()!)
}

export async function deleteTemplate(
  id: string
): Promise<EmailTemplateRecord | null> {
  const ref = db().collection(COLLECTION).doc(id)
  const snap = await ref.get()
  if (!snap.exists) return null
  const record = mapTemplate(snap.id, snap.data()!)
  await ref.delete()
  return record
}
