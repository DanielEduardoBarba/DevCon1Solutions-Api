import { FieldValue } from "firebase-admin/firestore"
import { db, toDate } from "../db/firebase.js"
import type { MailerSettingsRecord } from "../db/types.js"

const COLLECTION = "mailer_settings"
const DEFAULT_ID = "default"

function mapMailer(
  id: string,
  data: Record<string, unknown>
): MailerSettingsRecord {
  const smtp = (data.smtp || {}) as Record<string, unknown>
  const resend = (data.resend || {}) as Record<string, unknown>
  return {
    id,
    activeProvider: (data.activeProvider as "smtp" | "resend") || "smtp",
    smtp: {
      host: String(smtp.host || "smtp.gmail.com"),
      port: Number(smtp.port || 465),
      secure: smtp.secure !== false,
      user: String(smtp.user || ""),
      passEncrypted: String(smtp.passEncrypted || ""),
    },
    resend: {
      apiKeyEncrypted: String(resend.apiKeyEncrypted || ""),
      fromEmail: String(resend.fromEmail || ""),
      fromName: String(resend.fromName || ""),
    },
    defaultDeliverTo: String(data.defaultDeliverTo || ""),
    brandName: String(data.brandName || ""),
    brandUrl: String(data.brandUrl || ""),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

export async function getMailerSettings(): Promise<MailerSettingsRecord | null> {
  const snap = await db().collection(COLLECTION).doc(DEFAULT_ID).get()
  if (!snap.exists) return null
  return mapMailer(snap.id, snap.data()!)
}

export async function createMailerSettings(input: {
  activeProvider?: "smtp" | "resend"
  smtp?: Partial<MailerSettingsRecord["smtp"]>
  resend?: Partial<MailerSettingsRecord["resend"]>
  defaultDeliverTo?: string
  brandName?: string
  brandUrl?: string
}): Promise<MailerSettingsRecord> {
  const ref = db().collection(COLLECTION).doc(DEFAULT_ID)
  const payload = {
    activeProvider: input.activeProvider || "smtp",
    smtp: {
      host: input.smtp?.host || "smtp.gmail.com",
      port: input.smtp?.port || 465,
      secure: input.smtp?.secure ?? true,
      user: input.smtp?.user || "",
      passEncrypted: input.smtp?.passEncrypted || "",
    },
    resend: {
      apiKeyEncrypted: input.resend?.apiKeyEncrypted || "",
      fromEmail: input.resend?.fromEmail || "",
      fromName: input.resend?.fromName || "",
    },
    defaultDeliverTo: input.defaultDeliverTo || "",
    brandName: input.brandName || "Devcon1 Solutions",
    brandUrl: input.brandUrl || "https://devcon1solutions.com",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }
  await ref.set(payload)
  const created = await ref.get()
  return mapMailer(created.id, created.data()!)
}

export async function updateMailerSettings(
  patch: Partial<{
    activeProvider: "smtp" | "resend"
    smtp: MailerSettingsRecord["smtp"]
    resend: MailerSettingsRecord["resend"]
    defaultDeliverTo: string
    brandName: string
    brandUrl: string
  }>
): Promise<MailerSettingsRecord | null> {
  const ref = db().collection(COLLECTION).doc(DEFAULT_ID)
  const snap = await ref.get()
  if (!snap.exists) return null
  await ref.update({
    ...patch,
    updatedAt: FieldValue.serverTimestamp(),
  })
  const updated = await ref.get()
  return mapMailer(updated.id, updated.data()!)
}
