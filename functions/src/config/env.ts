import "dotenv/config"

function optional(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback
}

function requiredInProd(name: string, fallback?: string): string {
  const value = process.env[name]?.trim()
  if (value) return value
  if (fallback !== undefined) return fallback
  if (process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return ""
}

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  port: Number(optional("PORT", "5050")),

  mongodbUri: requiredInProd("MONGODB_URI", "mongodb://127.0.0.1:27017"),
  mongodbDbName: optional("MONGODB_DB_NAME", "devcon1"),

  /** 32+ character secret used to encrypt mailer credentials at rest */
  encryptionKey: requiredInProd(
    "ENCRYPTION_KEY",
    "dev-only-encryption-key-change-me-32b"
  ),

  /** Signs admin console JWTs */
  jwtSecret: requiredInProd("JWT_SECRET", "dev-only-jwt-secret-change-me"),

  jwtExpiresIn: optional("JWT_EXPIRES_IN", "8h"),
  mfaPendingExpiresIn: optional("MFA_PENDING_EXPIRES_IN", "10m"),
  emailOtpTtlSeconds: Number(optional("EMAIL_OTP_TTL_SECONDS", "600")),

  corsOrigins: optional("CORS_ORIGINS", "*")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  /** Optional bootstrap mailer defaults until console configures DB settings */
  defaultTransporterUser: optional("DEFAULT_TRANSPORTER_USER"),
  defaultTransporterPass: optional("DEFAULT_TRANSPORTER_PASS"),
  defaultTransporterHost: optional("DEFAULT_TRANSPORTER_HOST", "smtp.gmail.com"),
  defaultTransporterPort: Number(optional("DEFAULT_TRANSPORTER_PORT", "465")),
  defaultDeliverTo: optional("DEFAULT_TRANSPORTER_DELIVER_TO"),
  defaultBrandName: optional("DEFAULT_BRAND_NAME", "Devcon1 Solutions"),
  defaultBrandUrl: optional("DEFAULT_BRAND_URL", "https://devcon1solutions.com"),

  /** Legacy single key — migrated into Mongo on first boot if set */
  legacyApiKey: optional("API_KEY"),
}
