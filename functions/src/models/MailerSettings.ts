import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"

const SmtpSchema = new Schema(
  {
    host: { type: String, default: "smtp.gmail.com" },
    port: { type: Number, default: 465 },
    secure: { type: Boolean, default: true },
    user: { type: String, default: "" },
    passEncrypted: { type: String, default: "" },
  },
  { _id: false }
)

const ResendSchema = new Schema(
  {
    apiKeyEncrypted: { type: String, default: "" },
    fromEmail: { type: String, default: "" },
    fromName: { type: String, default: "" },
  },
  { _id: false }
)

const MailerSettingsSchema = new Schema(
  {
    singletonKey: { type: String, default: "default", unique: true },
    activeProvider: {
      type: String,
      enum: ["smtp", "resend"],
      default: "smtp",
    },
    smtp: { type: SmtpSchema, default: () => ({}) },
    resend: { type: ResendSchema, default: () => ({}) },
    defaultDeliverTo: { type: String, default: "" },
    brandName: { type: String, default: "Devcon1 Solutions" },
    brandUrl: { type: String, default: "https://devcon1solutions.com" },
  },
  { timestamps: true, collection: "mailer_settings" }
)

export type MailerSettingsDoc = InferSchemaType<typeof MailerSettingsSchema> & {
  _id: mongoose.Types.ObjectId
}

export function getMailerSettingsModel(): Model<MailerSettingsDoc> {
  return (
    (mongoose.models.MailerSettings as Model<MailerSettingsDoc>) ||
    mongoose.model<MailerSettingsDoc>("MailerSettings", MailerSettingsSchema)
  )
}
