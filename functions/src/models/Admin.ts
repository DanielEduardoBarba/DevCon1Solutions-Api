import mongoose from "mongoose"

const AdminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    mfaEnabled: { type: Boolean, default: false },
    mfaMethod: {
      type: String,
      enum: ["totp", "email"],
      default: undefined,
    },
    totpSecretEncrypted: { type: String, default: null },
  },
  { timestamps: true, collection: "admin" }
)

export type AdminDoc = mongoose.InferSchemaType<typeof AdminSchema> & {
  _id: mongoose.Types.ObjectId
}

export function getAdminModel(): mongoose.Model<AdminDoc> {
  return (
    (mongoose.models.Admin as mongoose.Model<AdminDoc>) ||
    mongoose.model<AdminDoc>("Admin", AdminSchema)
  )
}
