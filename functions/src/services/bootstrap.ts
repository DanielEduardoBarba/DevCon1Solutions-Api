import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { env } from "../config/env.js"
import { encryptSecret, sha256 } from "../utils/crypto.js"
import * as apiKeysRepo from "../repos/apiKeys.js"
import * as templateRepo from "../repos/templates.js"
import * as mailerRepo from "../repos/mailer.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = join(__dirname, "..", "templates")

function loadFile(name: string): string {
  return readFileSync(join(TEMPLATES_DIR, name), "utf8")
}

const DEFAULT_NOTIFICATION_TEXT = `{{BRAND_NAME}} — New contact form submission
Submitted: {{SUBMITTED_AT}} UTC

Name:    {{NAME}}
Email:   {{EMAIL}}
Phone:   {{PHONE}}

Message:
{{MESSAGE}}

{{EXTRA_FIELDS_TEXT}}`

const DEFAULT_CONFIRMATION_SUBJECT = "We received your message — {{BRAND_NAME}}"

const DEFAULT_CONFIRMATION_TEXT = `{{BRAND_NAME}} — Thanks for reaching out!

Hi {{NAME_DISPLAY}},

We received your message and a member of our team will get back to you shortly.
For your records, here's a copy of what you sent us:

Submitted: {{SUBMITTED_AT}} UTC
Name:    {{NAME}}
Email:   {{EMAIL}}
Phone:   {{PHONE}}

Message:
{{MESSAGE}}

— The {{BRAND_NAME}} team
{{BRAND_URL}}`

let bootstrapped = false

export async function bootstrapDefaults(): Promise<void> {
  if (bootstrapped) return
  bootstrapped = true

  const existingSettings = await mailerRepo.getMailerSettings()
  if (!existingSettings) {
    await mailerRepo.createMailerSettings({
      activeProvider: "smtp",
      smtp: {
        host: env.defaultTransporterHost,
        port: env.defaultTransporterPort,
        secure: env.defaultTransporterPort === 465,
        user: env.defaultTransporterUser,
        passEncrypted: env.defaultTransporterPass
          ? encryptSecret(env.defaultTransporterPass)
          : "",
      },
      defaultDeliverTo: env.defaultDeliverTo,
      brandName: env.defaultBrandName,
      brandUrl: env.defaultBrandUrl,
    })
    console.log("Seeded default mailer settings")
  }

  const defaults = [
    {
      slug: "default-notification",
      name: "Default notification",
      type: "notification" as const,
      subjectTemplate: "New contact form submission — {{NAME_DISPLAY}}",
      htmlTemplate: loadFile("contact-email.html"),
      textTemplate: DEFAULT_NOTIFICATION_TEXT,
      description: "Built-in notification email for contact submissions",
      isSystemDefault: true,
    },
    {
      slug: "default-confirmation",
      name: "Default confirmation",
      type: "confirmation" as const,
      subjectTemplate: DEFAULT_CONFIRMATION_SUBJECT,
      htmlTemplate: loadFile("contact-confirmation-email.html"),
      textTemplate: DEFAULT_CONFIRMATION_TEXT,
      description: "Built-in confirmation email sent back to the visitor",
      isSystemDefault: true,
    },
  ]

  for (const t of defaults) {
    const existing = await templateRepo.getTemplateBySlug(t.slug)
    if (!existing) {
      await templateRepo.createTemplate(t)
      console.log(`Seeded template: ${t.slug}`)
    }
  }

  if (env.legacyApiKey) {
    const hash = sha256(env.legacyApiKey)
    const exists = await apiKeysRepo.findApiKeyByHash(hash)
    if (!exists) {
      await apiKeysRepo.createApiKey({
        name: "Legacy env API_KEY",
        prefix: env.legacyApiKey.slice(0, 12),
        keyHash: hash,
        notes: "Imported from API_KEY environment variable on first boot",
      })
      console.log("Imported legacy API_KEY into Firestore")
    }
  }
}
