import nodemailer from "nodemailer"
import { config } from "./config.js"

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

/**
 * Build a clean, Devcon1 Solutions-branded HTML email for a contact-form
 * submission. Includes a plain-text fallback for clients that do not render
 * HTML.
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

  const rows = [
    { label: "Name", value: escapeHtml(name) },
    {
      label: "Email",
      value: email
        ? `<a href="mailto:${escapeHtml(email)}" style="color:${brand.primaryColor};text-decoration:none;">${escapeHtml(email)}</a>`
        : "",
    },
    {
      label: "Phone",
      value: phone
        ? `<a href="tel:${escapeHtml(phone)}" style="color:${brand.primaryColor};text-decoration:none;">${escapeHtml(phone)}</a>`
        : "",
    },
  ]

  const rowsHtml = rows
    .map(({ label, value }) => {
      const display = value || `<span style="color:#94a3b8;">—</span>`
      return `
        <tr>
          <td style="padding:10px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.04em;width:120px;">${label}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${display}</td>
        </tr>`
    })
    .join("")

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">
      New contact form submission from ${escapeHtml(name || "a visitor")}
    </span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
            <tr>
              <td style="background:${brand.accentColor};padding:24px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.02em;">
                      ${escapeHtml(brand.name)}
                    </td>
                    <td align="right" style="font-size:12px;color:#94a3b8;">
                      ${escapeHtml(submittedAt)} UTC
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 8px 28px;">
                <div style="display:inline-block;padding:4px 10px;border-radius:999px;background:${brand.primaryColor}1a;color:${brand.primaryColor};font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">
                  Contact Form
                </div>
                <h1 style="margin:14px 0 6px 0;font-size:22px;line-height:1.3;color:#0f172a;">
                  New message from ${escapeHtml(name || "a visitor")}
                </h1>
                <p style="margin:0 0 20px 0;color:#475569;font-size:14px;line-height:1.6;">
                  A new inquiry just landed in your inbox from the ${escapeHtml(brand.name)} website.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                  ${rowsHtml}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 8px 28px;">
                <div style="font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">
                  Message
                </div>
                <div style="padding:16px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid ${brand.primaryColor};border-radius:8px;font-size:14px;line-height:1.6;color:#0f172a;white-space:pre-wrap;">
                  ${formatMultiline(comment) || `<span style="color:#94a3b8;">No message provided.</span>`}
                </div>
              </td>
            </tr>
            ${email ? `
            <tr>
              <td align="center" style="padding:24px 28px 8px 28px;">
                <a href="mailto:${escapeHtml(email)}" style="display:inline-block;padding:12px 22px;background:${brand.primaryColor};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
                  Reply to ${escapeHtml(name || email)}
                </a>
              </td>
            </tr>` : ""}
            <tr>
              <td style="padding:24px 28px 28px 28px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                  Sent automatically by the ${escapeHtml(brand.name)} API.<br />
                  <a href="${escapeHtml(brand.url)}" style="color:${brand.primaryColor};text-decoration:none;">${escapeHtml(brand.url)}</a>
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0 0;font-size:11px;color:#94a3b8;">
            © ${new Date().getFullYear()} ${escapeHtml(brand.name)}. All rights reserved.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return { subject, text, html }
}
