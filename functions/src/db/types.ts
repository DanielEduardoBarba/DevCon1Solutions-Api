export type AdminRecord = {
  id: string
  email: string
  passwordHash: string
  mfaEnabled: boolean
  mfaMethod: "totp" | "email" | null
  totpSecretEncrypted: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

export type ApiKeyRecord = {
  id: string
  name: string
  prefix: string
  keyHash: string
  active: boolean
  deliverTo: string | null
  brandName: string | null
  brandUrl: string | null
  sendNotification: boolean
  sendConfirmation: boolean
  allowOverrides: boolean
  notificationTemplateId: string | null
  confirmationTemplateId: string | null
  notes: string
  lastUsedAt: Date | null
  createdAt: Date | null
  updatedAt: Date | null
}

export type MailerSettingsRecord = {
  id: string
  activeProvider: "smtp" | "resend"
  smtp: {
    host: string
    port: number
    secure: boolean
    user: string
    passEncrypted: string
  }
  resend: {
    apiKeyEncrypted: string
    fromEmail: string
    fromName: string
  }
  defaultDeliverTo: string
  brandName: string
  brandUrl: string
  createdAt: Date | null
  updatedAt: Date | null
}

export type EmailTemplateRecord = {
  id: string
  name: string
  slug: string
  type: "notification" | "confirmation" | "custom"
  subjectTemplate: string
  htmlTemplate: string
  textTemplate: string
  description: string
  isSystemDefault: boolean
  createdAt: Date | null
  updatedAt: Date | null
}

export type MfaChallengeRecord = {
  id: string
  adminId: string
  codeHash: string
  expiresAt: Date
  consumed: boolean
  createdAt: Date | null
}
