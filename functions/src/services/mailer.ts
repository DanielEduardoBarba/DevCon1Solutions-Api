import nodemailer from "nodemailer"
import { Resend } from "resend"
import { env } from "../config/env.js"
import { decryptSecret } from "../utils/crypto.js"
import {
  escapeHtml,
  formatMultiline,
  renderTemplate,
} from "../utils/templates.js"
import { getMailerSettingsModel } from "../models/MailerSettings.js"
import { getEmailTemplateModel, type EmailTemplateDoc } from "../models/EmailTemplate.js"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { Types } from "mongoose"

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPLY_BUTTON_TEMPLATE = readFileSync(
  join(__dirname, "..", "templates", "contact-email-reply-button.html"),
  "utf8"
)

export type Brand = { name: string; url: string }

export type ContactPayload = {
  name?: string
  email?: string
  phone?: string
  comment?: string
  message?: string
  subject?: string
  fields?: Record<string, string | number | boolean | null | undefined>
  replyTo?: string
  to?: string
  sendNotification?: boolean
  sendConfirmation?: boolean
  templateId?: string
  confirmationTemplateId?: string
  brand?: Partial<Brand>
  meta?: Record<string, unknown>
}

export type ResolvedMailContext = {
  brand: Brand
  deliverTo: string
  fromAddress: string
  provider: "smtp" | "resend"
}

async function loadSettings() {
  const Mailer = getMailerSettingsModel()
  const settings = await Mailer.findOne({ singletonKey: "default" })
  if (!settings) {
    throw new Error("Mailer settings not configured")
  }
  return settings
}

export async function getResolvedMailContext(
  overrides?: { deliverTo?: string | null; brandName?: string | null; brandUrl?: string | null }
): Promise<ResolvedMailContext> {
  const settings = await loadSettings()
  const brand: Brand = {
    name: overrides?.brandName || settings.brandName || env.defaultBrandName,
    url: overrides?.brandUrl || settings.brandUrl || env.defaultBrandUrl,
  }
  const deliverTo =
    overrides?.deliverTo ||
    settings.defaultDeliverTo ||
    env.defaultDeliverTo ||
    ""

  if (!deliverTo) {
    throw new Error("No deliver-to address configured")
  }

  let fromAddress = `"${brand.name}" <noreply@devcon1solutions.com>`
  if (settings.activeProvider === "smtp" && settings.smtp?.user) {
    fromAddress = `"${brand.name}" <${settings.smtp.user}>`
  } else if (settings.activeProvider === "resend" && settings.resend?.fromEmail) {
    const name = settings.resend.fromName || brand.name
    fromAddress = `"${name}" <${settings.resend.fromEmail}>`
  }

  return {
    brand,
    deliverTo,
    fromAddress,
    provider: settings.activeProvider,
  }
}

async function sendViaSmtp(mail: {
  from: string
  to: string
  replyTo?: string
  subject: string
  text: string
  html: string
}): Promise<void> {
  const settings = await loadSettings()
  const smtp = settings.smtp
  if (!smtp?.user || !smtp.passEncrypted) {
    throw new Error("SMTP credentials are not configured")
  }
  const pass = decryptSecret(smtp.passEncrypted)
  const transporter = nodemailer.createTransport({
    host: smtp.host || "smtp.gmail.com",
    port: smtp.port || 465,
    secure: smtp.secure ?? true,
    auth: { user: smtp.user, pass },
  })
  await transporter.sendMail(mail)
}

async function sendViaResend(mail: {
  from: string
  to: string
  replyTo?: string
  subject: string
  text: string
  html: string
}): Promise<void> {
  const settings = await loadSettings()
  if (!settings.resend?.apiKeyEncrypted) {
    throw new Error("Resend API key is not configured")
  }
  const apiKey = decryptSecret(settings.resend.apiKeyEncrypted)
  const resend = new Resend(apiKey)
  const result = await resend.emails.send({
    from: mail.from,
    to: mail.to,
    replyTo: mail.replyTo,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  })
  if (result.error) {
    throw new Error(result.error.message)
  }
}

export async function sendMail(mail: {
  from: string
  to: string
  replyTo?: string
  subject: string
  text: string
  html: string
}): Promise<void> {
  const settings = await loadSettings()
  if (settings.activeProvider === "resend") {
    await sendViaResend(mail)
  } else {
    await sendViaSmtp(mail)
  }
}

function extraFieldsHtml(fields?: ContactPayload["fields"]): string {
  if (!fields || Object.keys(fields).length === 0) return ""
  const rows = Object.entries(fields)
    .map(([k, v]) => {
      const val =
        v === undefined || v === null || v === ""
          ? `<span style="color:#52525b;">—</span>`
          : escapeHtml(String(v))
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#a1a1aa;font-size:13px;width:120px;vertical-align:top;">${escapeHtml(k)}</td>
        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#e5e7eb;font-size:14px;">${val}</td>
      </tr>`
    })
    .join("")
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">${rows}</table>`
}

function extraFieldsText(fields?: ContactPayload["fields"]): string {
  if (!fields || Object.keys(fields).length === 0) return ""
  return (
    "\n" +
    Object.entries(fields)
      .map(([k, v]) => `${k}: ${v ?? "(not provided)"}`)
      .join("\n")
  )
}

export function buildTemplateVars(
  payload: ContactPayload,
  brand: Brand
): Record<string, string> {
  const name = payload.name || ""
  const email = payload.email || ""
  const phone = payload.phone || ""
  const comment = payload.comment || payload.message || ""
  const submittedAt = new Date().toLocaleString("en-US", {
    timeZone: "UTC",
    dateStyle: "medium",
    timeStyle: "short",
  })

  const EMPTY = `<span style="color:#52525b;">—</span>`
  const emailCell = email
    ? `<a href="mailto:${escapeHtml(email)}" style="color:#06b6d4;text-decoration:none;">${escapeHtml(email)}</a>`
    : EMPTY
  const phoneCell = phone
    ? `<a href="tel:${escapeHtml(phone)}" style="color:#06b6d4;text-decoration:none;">${escapeHtml(phone)}</a>`
    : EMPTY
  const nameCell = name ? escapeHtml(name) : EMPTY
  const messageCell = comment
    ? formatMultiline(comment)
    : `<span style="color:#71717a;">No message provided.</span>`

  const replyButton = email
    ? renderTemplate(REPLY_BUTTON_TEMPLATE, {
        EMAIL: escapeHtml(email),
        REPLY_TARGET: escapeHtml(name || email),
      })
    : ""

  return {
    SUBJECT: escapeHtml(
      payload.subject ||
        `New contact form submission${name ? ` — ${name}` : ""}`
    ),
    PREHEADER: escapeHtml(
      `New contact form submission from ${name || "a visitor"}`
    ),
    BRAND_NAME: escapeHtml(brand.name),
    BRAND_URL: escapeHtml(brand.url),
    SUBMITTED_AT: escapeHtml(submittedAt),
    NAME: escapeHtml(name || "(not provided)"),
    NAME_DISPLAY: escapeHtml(name || "a visitor"),
    NAME_CELL: nameCell,
    EMAIL: escapeHtml(email || "(not provided)"),
    EMAIL_CELL: emailCell,
    PHONE: escapeHtml(phone || "(not provided)"),
    PHONE_CELL: phoneCell,
    MESSAGE: messageCell,
    COMMENT: messageCell,
    REPLY_BUTTON: replyButton,
    EXTRA_FIELDS_HTML: extraFieldsHtml(payload.fields),
    EXTRA_FIELDS_TEXT: extraFieldsText(payload.fields),
    YEAR: String(new Date().getFullYear()),
    META_JSON: escapeHtml(JSON.stringify(payload.meta || {})),
  }
}

async function resolveTemplate(
  id: string | Types.ObjectId | null | undefined,
  type: "notification" | "confirmation"
): Promise<EmailTemplateDoc | null> {
  const Template = getEmailTemplateModel()
  if (id) {
    const found = await Template.findById(id)
    if (found) return found
  }
  const slug = type === "notification" ? "default-notification" : "default-confirmation"
  return Template.findOne({ slug })
}

export async function renderEmailFromTemplate(
  template: EmailTemplateDoc,
  vars: Record<string, string>,
  subjectOverride?: string
): Promise<{ subject: string; text: string; html: string }> {
  const subject = subjectOverride
    ? subjectOverride
    : renderTemplate(template.subjectTemplate, vars)
  // Subject in HTML title should match
  const htmlVars = { ...vars, SUBJECT: escapeHtml(subject) }
  const html = renderTemplate(template.htmlTemplate, htmlVars)
  const text = template.textTemplate
    ? renderTemplate(template.textTemplate, {
        ...vars,
        MESSAGE: (vars.MESSAGE || "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""),
        NAME_DISPLAY: vars.NAME_DISPLAY.replace(/&[^;]+;/g, "") || "there",
      })
    : subject
  return { subject, text, html }
}

export async function buildContactEmails(
  payload: ContactPayload,
  opts: {
    brand: Brand
    notificationTemplateId?: string | Types.ObjectId | null
    confirmationTemplateId?: string | Types.ObjectId | null
  }
): Promise<{
  notification: { subject: string; text: string; html: string }
  confirmation: { subject: string; text: string; html: string }
}> {
  const vars = buildTemplateVars(payload, opts.brand)
  // Confirmation uses friendlier NAME_DISPLAY default
  const confirmVars = {
    ...vars,
    NAME_DISPLAY: escapeHtml(payload.name || "there"),
    PREHEADER: escapeHtml(
      `Thanks for reaching out to ${opts.brand.name} — we'll be in touch soon.`
    ),
  }

  const notifTpl = await resolveTemplate(opts.notificationTemplateId, "notification")
  const confTpl = await resolveTemplate(opts.confirmationTemplateId, "confirmation")
  if (!notifTpl || !confTpl) {
    throw new Error("Email templates are not available")
  }

  const notification = await renderEmailFromTemplate(
    notifTpl,
    vars,
    payload.subject
  )
  const confirmation = await renderEmailFromTemplate(confTpl, confirmVars)
  return { notification, confirmation }
}

export function publicMailerStatus(settings: {
  activeProvider: string
  smtp?: {
    host?: string
    port?: number
    secure?: boolean
    user?: string
    passEncrypted?: string
  } | null
  resend?: {
    fromEmail?: string
    fromName?: string
    apiKeyEncrypted?: string
  } | null
  defaultDeliverTo?: string
  brandName?: string
  brandUrl?: string
}) {
  return {
    activeProvider: settings.activeProvider,
    defaultDeliverTo: settings.defaultDeliverTo || "",
    brandName: settings.brandName || "",
    brandUrl: settings.brandUrl || "",
    smtp: {
      host: settings.smtp?.host || "",
      port: settings.smtp?.port || 465,
      secure: settings.smtp?.secure ?? true,
      user: settings.smtp?.user || "",
      hasPassword: Boolean(settings.smtp?.passEncrypted),
    },
    resend: {
      fromEmail: settings.resend?.fromEmail || "",
      fromName: settings.resend?.fromName || "",
      hasApiKey: Boolean(settings.resend?.apiKeyEncrypted),
    },
  }
}
