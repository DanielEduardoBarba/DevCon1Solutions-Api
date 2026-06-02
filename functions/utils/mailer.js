import nodemailer from "nodemailer"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "./config.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = join(__dirname, "templates")

const CONTACT_TEMPLATE = readFileSync(join(TEMPLATES_DIR, "contact-email.html"), "utf8")
const REPLY_BUTTON_TEMPLATE = readFileSync(join(TEMPLATES_DIR, "contact-email-reply-button.html"), "utf8")
const CONFIRMATION_TEMPLATE = readFileSync(join(TEMPLATES_DIR, "contact-confirmation-email.html"), "utf8")

export const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: config.transporter_auth,
})

function escapeHtml(value) {
  if (value === undefined || value === null) return ""
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatMultiline(value) {
  return escapeHtml(value).replace(/\r?\n/g, "<br />")
}

function renderTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : ""
  })
}

const EMPTY_CELL = `<span style="color:#52525b;">—</span>`

/**
 * Build a clean, Devcon1 Solutions-branded HTML email for a contact-form
 * submission. Loads the HTML template from disk and fills {{PLACEHOLDERS}}.
 * Includes a plain-text fallback for clients that do not render HTML.
 */
export function buildContactEmail({ name, email, phone, comment }) {
  const brand = config.brand
  const submittedAt = new Date().toLocaleString("en-US", {
    timeZone: "UTC",
    dateStyle: "medium",
    timeStyle: "short",
  })

  const subject = `New contact form submission${name ? ` — ${name}` : ""}`

  const text = [
    `${brand.name} — New contact form submission`,
    `Submitted: ${submittedAt} UTC`,
    "",
    `Name:    ${name || "(not provided)"}`,
    `Email:   ${email || "(not provided)"}`,
    `Phone:   ${phone || "(not provided)"}`,
    "",
    "Message:",
    comment || "(no message)",
  ].join("\n")

  const emailCell = email
    ? `<a href="mailto:${escapeHtml(email)}" style="color:#06b6d4;text-decoration:none;">${escapeHtml(email)}</a>`
    : EMPTY_CELL
  const phoneCell = phone
    ? `<a href="tel:${escapeHtml(phone)}" style="color:#06b6d4;text-decoration:none;">${escapeHtml(phone)}</a>`
    : EMPTY_CELL
  const nameCell = name ? escapeHtml(name) : EMPTY_CELL
  const messageCell = comment
    ? formatMultiline(comment)
    : `<span style="color:#71717a;">No message provided.</span>`

  const replyButton = email
    ? renderTemplate(REPLY_BUTTON_TEMPLATE, {
        EMAIL: escapeHtml(email),
        REPLY_TARGET: escapeHtml(name || email),
      })
    : ""

  const html = renderTemplate(CONTACT_TEMPLATE, {
    SUBJECT: escapeHtml(subject),
    PREHEADER: `New contact form submission from ${escapeHtml(name || "a visitor")}`,
    BRAND_NAME: escapeHtml(brand.name),
    BRAND_URL: escapeHtml(brand.url),
    SUBMITTED_AT: escapeHtml(submittedAt),
    NAME_DISPLAY: escapeHtml(name || "a visitor"),
    NAME_CELL: nameCell,
    EMAIL_CELL: emailCell,
    PHONE_CELL: phoneCell,
    MESSAGE: messageCell,
    REPLY_BUTTON: replyButton,
    YEAR: String(new Date().getFullYear()),
  })

  return { subject, text, html }
}

/**
 * Build a confirmation email sent back to the visitor who submitted the
 * contact form. Mirrors the notification email layout but reframes copy as a
 * thank-you / receipt.
 */
export function buildContactConfirmationEmail({ name, email, phone, comment }) {
  const brand = config.brand
  const submittedAt = new Date().toLocaleString("en-US", {
    timeZone: "UTC",
    dateStyle: "medium",
    timeStyle: "short",
  })

  const subject = `We received your message — ${brand.name}`

  const text = [
    `${brand.name} — Thanks for reaching out!`,
    "",
    `Hi ${name || "there"},`,
    "",
    "We received your message and a member of our team will get back to you shortly.",
    "For your records, here's a copy of what you sent us:",
    "",
    `Submitted: ${submittedAt} UTC`,
    `Name:    ${name || "(not provided)"}`,
    `Email:   ${email || "(not provided)"}`,
    `Phone:   ${phone || "(not provided)"}`,
    "",
    "Message:",
    comment || "(no message)",
    "",
    `— The ${brand.name} team`,
    brand.url,
  ].join("\n")

  const emailCell = email
    ? `<a href="mailto:${escapeHtml(email)}" style="color:#06b6d4;text-decoration:none;">${escapeHtml(email)}</a>`
    : EMPTY_CELL
  const phoneCell = phone
    ? `<a href="tel:${escapeHtml(phone)}" style="color:#06b6d4;text-decoration:none;">${escapeHtml(phone)}</a>`
    : EMPTY_CELL
  const nameCell = name ? escapeHtml(name) : EMPTY_CELL
  const messageCell = comment
    ? formatMultiline(comment)
    : `<span style="color:#71717a;">No message provided.</span>`

  const html = renderTemplate(CONFIRMATION_TEMPLATE, {
    SUBJECT: escapeHtml(subject),
    PREHEADER: `Thanks for reaching out to ${escapeHtml(brand.name)} — we'll be in touch soon.`,
    BRAND_NAME: escapeHtml(brand.name),
    BRAND_URL: escapeHtml(brand.url),
    SUBMITTED_AT: escapeHtml(submittedAt),
    NAME_DISPLAY: escapeHtml(name || "there"),
    NAME_CELL: nameCell,
    EMAIL_CELL: emailCell,
    PHONE_CELL: phoneCell,
    MESSAGE: messageCell,
    YEAR: String(new Date().getFullYear()),
  })

  return { subject, text, html }
}
