import { Router } from "express"
import { z } from "zod"
import {
  asyncHandler,
  requireAdminSession,
} from "../middleware/auth.js"
import { encryptSecret } from "../utils/crypto.js"
import * as mailerRepo from "../repos/mailer.js"
import { publicMailerStatus, sendMail, getResolvedMailContext } from "../services/mailer.js"

const router = Router()
router.use(requireAdminSession)

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const settings = await mailerRepo.getMailerSettings()
    if (!settings) {
      res.status(404).json({ error: "Mailer settings missing" })
      return
    }
    res.json({ mailer: publicMailerStatus(settings) })
  })
)

const updateSchema = z.object({
  activeProvider: z.enum(["smtp", "resend"]).optional(),
  defaultDeliverTo: z.string().email().optional().or(z.literal("")),
  brandName: z.string().max(120).optional(),
  brandUrl: z.string().url().optional().or(z.literal("")),
  smtp: z
    .object({
      host: z.string().optional(),
      port: z.number().int().positive().optional(),
      secure: z.boolean().optional(),
      user: z.string().optional(),
      pass: z.string().optional(),
    })
    .optional(),
  resend: z
    .object({
      apiKey: z.string().optional(),
      fromEmail: z.string().email().optional().or(z.literal("")),
      fromName: z.string().optional(),
    })
    .optional(),
})

router.put(
  "/",
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body)
    const settings = await mailerRepo.getMailerSettings()
    if (!settings) {
      res.status(404).json({ error: "Mailer settings missing" })
      return
    }

    const smtp = { ...settings.smtp }
    if (body.smtp) {
      if (body.smtp.host !== undefined) smtp.host = body.smtp.host
      if (body.smtp.port !== undefined) smtp.port = body.smtp.port
      if (body.smtp.secure !== undefined) smtp.secure = body.smtp.secure
      if (body.smtp.user !== undefined) smtp.user = body.smtp.user
      if (body.smtp.pass) smtp.passEncrypted = encryptSecret(body.smtp.pass)
    }

    const resend = { ...settings.resend }
    if (body.resend) {
      if (body.resend.fromEmail !== undefined) resend.fromEmail = body.resend.fromEmail
      if (body.resend.fromName !== undefined) resend.fromName = body.resend.fromName
      if (body.resend.apiKey) {
        resend.apiKeyEncrypted = encryptSecret(body.resend.apiKey)
      }
    }

    const updated = await mailerRepo.updateMailerSettings({
      ...(body.activeProvider ? { activeProvider: body.activeProvider } : {}),
      ...(body.defaultDeliverTo !== undefined
        ? { defaultDeliverTo: body.defaultDeliverTo }
        : {}),
      ...(body.brandName !== undefined ? { brandName: body.brandName } : {}),
      ...(body.brandUrl !== undefined ? { brandUrl: body.brandUrl } : {}),
      smtp,
      resend,
    })

    res.json({ mailer: publicMailerStatus(updated!) })
  })
)

router.post(
  "/test",
  asyncHandler(async (req, res) => {
    const body = z
      .object({ to: z.string().email().optional() })
      .parse(req.body || {})
    const ctx = await getResolvedMailContext()
    const to = body.to || ctx.deliverTo
    await sendMail({
      from: ctx.fromAddress,
      to,
      subject: `${ctx.brand.name} — mailer test`,
      text: `This is a test email from the Devcon1 console via ${ctx.provider}.`,
      html: `<p>This is a test email from the Devcon1 console via <strong>${ctx.provider}</strong>.</p>`,
    })
    res.json({ ok: true, to, provider: ctx.provider })
  })
)

export default router
