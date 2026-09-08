import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"

const ApiKeySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    prefix: { type: String, required: true },
    keyHash: { type: String, required: true, unique: true, index: true },
    active: { type: Boolean, default: true },
    deliverTo: { type: String, default: null },
    brandName: { type: String, default: null },
    brandUrl: { type: String, default: null },
    sendNotification: { type: Boolean, default: true },
    sendConfirmation: { type: Boolean, default: true },
    allowOverrides: { type: Boolean, default: true },
    notificationTemplateId: { type: Schema.Types.ObjectId, ref: "EmailTemplate", default: null },
    confirmationTemplateId: { type: Schema.Types.ObjectId, ref: "EmailTemplate", default: null },
    notes: { type: String, default: "" },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "api_keys" }
)

export type ApiKeyDoc = InferSchemaType<typeof ApiKeySchema> & {
  _id: mongoose.Types.ObjectId
}

export function getApiKeyModel(): Model<ApiKeyDoc> {
  return (
    (mongoose.models.ApiKey as Model<ApiKeyDoc>) ||
    mongoose.model<ApiKeyDoc>("ApiKey", ApiKeySchema)
  )
}
