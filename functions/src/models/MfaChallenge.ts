import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"

const MfaChallengeSchema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "Admin", required: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    consumed: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "mfa_challenges" }
)

MfaChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export type MfaChallengeDoc = InferSchemaType<typeof MfaChallengeSchema> & {
  _id: mongoose.Types.ObjectId
}

export function getMfaChallengeModel(): Model<MfaChallengeDoc> {
  return (
    (mongoose.models.MfaChallenge as Model<MfaChallengeDoc>) ||
    mongoose.model<MfaChallengeDoc>("MfaChallenge", MfaChallengeSchema)
  )
}
