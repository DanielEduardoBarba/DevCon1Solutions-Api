import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { env } from "../config/env.js"
import { encryptSecret, sha256 } from "../utils/crypto.js"
import { getApiKeyModel } from "../models/ApiKey.js"
import { getEmailTemplateModel } from "../models/EmailTemplate.js"
import { getMailerSettingsModel } from "../models/MailerSettings.js"

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

  const Mailer = getMailerSettingsModel()
  const existingSettings = await Mailer.findOne({ singletonKey: "default" })
  if (!existingSettings) {
    await Mailer.create({
      singletonKey: "default",
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

  const Template = getEmailTemplateModel()
  // Keep {{REPLY_BUTTON}} as a runtime placeholder — filled by mailer service
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
    const existing = await Template.findOne({ slug: t.slug })
    if (!existing) {
      await Template.create(t)
      console.log(`Seeded template: ${t.slug}`)
    }
  }

  // Migrate legacy env API_KEY into Mongo once
  if (env.legacyApiKey) {
    const ApiKey = getApiKeyModel()
    const hash = sha256(env.legacyApiKey)
    const exists = await ApiKey.findOne({ keyHash: hash })
    if (!exists) {
      const prefix = env.legacyApiKey.slice(0, 12)
      await ApiKey.create({
        name: "Legacy env API_KEY",
        prefix,
        keyHash: hash,
        active: true,
        notes: "Imported from API_KEY environment variable on first boot",
      })
      console.log("Imported legacy API_KEY into MongoDB")
    }
  }
}
