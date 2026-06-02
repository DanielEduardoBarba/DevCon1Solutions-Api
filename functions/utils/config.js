import "dotenv/config"

function required(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const config = {
  transporter_auth: {
    user: required("TRANSPORTER_USER"),
    pass: required("TRANSPORTER_PASS"),
  },
  transporter_deliver_to: required("TRANSPORTER_DELIVER_TO"),
  key: required("API_KEY"),
  brand: {
    name: process.env.BRAND_NAME || "Devcon1 Solutions",
    url: process.env.BRAND_URL || "https://devcon1solutions.com",
    primaryColor: process.env.BRAND_PRIMARY_COLOR || "#0a84ff",
    accentColor: process.env.BRAND_ACCENT_COLOR || "#0b1220",
  },
}
