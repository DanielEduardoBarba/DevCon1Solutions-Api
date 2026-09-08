import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"

const EmailTemplateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    type: {
      type: String,
      enum: ["notification", "confirmation", "custom"],
      required: true,
    },
    subjectTemplate: { type: String, required: true },
    htmlTemplate: { type: String, required: true },
    textTemplate: { type: String, default: "" },
    description: { type: String, default: "" },
    isSystemDefault: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "email_templates" }
)

export type EmailTemplateDoc = InferSchemaType<typeof EmailTemplateSchema> & {
  _id: mongoose.Types.ObjectId
}

export function getEmailTemplateModel(): Model<EmailTemplateDoc> {
  return (
    (mongoose.models.EmailTemplate as Model<EmailTemplateDoc>) ||
    mongoose.model<EmailTemplateDoc>("EmailTemplate", EmailTemplateSchema)
  )
}
