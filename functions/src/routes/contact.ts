import { Router } from "express"
import { z } from "zod"
import {
  asyncHandler,
  requireApiKey,
  type AuthedRequest,
} from "../middleware/auth.js"
import {
  buildContactEmails,
  getResolvedMailContext,
  sendMail,
  type ContactPayload,
} from "../services/mailer.js"

const router = Router()

const contactSchema = z
  .object({
    key: z.string().optional(),
    apiKey: z.string().optional(),
    name: z.union([z.string(), z.number()]).optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.union([z.string(), z.number()]).optional(),
    comment: z.string().optional(),
    message: z.string().optional(),
    subject: z.string().max(200).optional(),
    fields: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
    replyTo: z.string().email().optional(),
    to: z.string().email().optional(),
    sendNotification: z.boolean().optional(),
    sendConfirmation: z.boolean().optional(),
    templateId: z.string().optional(),
    confirmationTemplateId: z.string().optional(),
    brand: z
      .object({
        name: z.string().optional(),
        url: z.string().optional(),
      })
      .optional(),
    meta: z.record(z.unknown()).optional(),
  })
  .passthrough()

async function handleContact(req: AuthedRequest, res: import("express").Response) {
  const parsed = contactSchema.parse(req.body || {})
  const apiKey = req.apiKey!
  const payload: ContactPayload = {
    name: parsed.name !== undefined ? String(parsed.name) : undefined,
    email: parsed.email || undefined,
    phone: parsed.phone !== undefined ? String(parsed.phone) : undefined,
    comment: parsed.comment,
    message: parsed.message,
    subject: parsed.subject,
    fields: parsed.fields,
    replyTo: parsed.replyTo,
    to: parsed.to,
    sendNotification: parsed.sendNotification,
    sendConfirmation: parsed.sendConfirmation,
    templateId: parsed.templateId,
    confirmationTemplateId: parsed.confirmationTemplateId,
    brand: parsed.brand,
    meta: parsed.meta,
  }

  // Require at least some content
  const hasContent =
    payload.name ||
    payload.email ||
    payload.phone ||
    payload.comment ||
    payload.message ||
    (payload.fields && Object.keys(payload.fields).length > 0)

  if (!hasContent) {
    res.status(400).json({
      error: "Empty submission",
      response: "Provide at least one of name, email, phone, comment/message, or fields",
    })
    return
  }

  const allow = apiKey.allowOverrides !== false

  const deliverTo =
    (allow && payload.to) || apiKey.deliverTo || undefined
  const brandName =
    (allow && payload.brand?.name) || apiKey.brandName || undefined
  const brandUrl =
    (allow && payload.brand?.url) || apiKey.brandUrl || undefined

  const ctx = await getResolvedMailContext({
    deliverTo,
    brandName,
    brandUrl,
  })

  const notificationTemplateId =
    (allow && payload.templateId) || apiKey.notificationTemplateId || null
  const confirmationTemplateId =
    (allow && payload.confirmationTemplateId) ||
    apiKey.confirmationTemplateId ||
    null

  const { notification, confirmation } = await buildContactEmails(payload, {
    brand: ctx.brand,
    notificationTemplateId,
    confirmationTemplateId,
  })

  const sendNotification =
    payload.sendNotification ?? apiKey.sendNotification ?? true
  const sendConfirmation =
    payload.sendConfirmation ?? apiKey.sendConfirmation ?? true

  if (sendNotification) {
    try {
      await sendMail({
        from: ctx.fromAddress,
        to: ctx.deliverTo,
        replyTo: payload.replyTo || payload.email || undefined,
        subject: notification.subject,
        text: notification.text,
        html: notification.html,
      })
    } catch (error) {
      console.error("Error sending notification email:", error)
      res.status(500).json({
        error: "mail_failed",
        response: "Error sending message...",
      })
      return
    }
  }

  if (sendConfirmation && payload.email) {
    try {
      await sendMail({
        from: ctx.fromAddress,
        to: payload.email,
        replyTo: ctx.deliverTo,
        subject: confirmation.subject,
        text: confirmation.text,
        html: confirmation.html,
      })
    } catch (error) {
      console.error("Error sending confirmation email:", error)
      // Best-effort — team already notified
    }
  }

  res.status(200).json({
    response: "Message sent successfully! We will contact you shortly",
    ok: true,
  })
}

router.post("/", requireApiKey, asyncHandler(handleContact))
router.post("/form", requireApiKey, asyncHandler(handleContact))

export default router
