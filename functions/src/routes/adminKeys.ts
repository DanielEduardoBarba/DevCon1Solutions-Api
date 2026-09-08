import { Router } from "express"
import { z } from "zod"
import {
  asyncHandler,
  requireAdminSession,
} from "../middleware/auth.js"
import { generateApiKey } from "../utils/crypto.js"
import { getApiKeyModel } from "../models/ApiKey.js"

const router = Router()
router.use(requireAdminSession)

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const ApiKey = getApiKeyModel()
    const keys = await ApiKey.find().sort({ createdAt: -1 }).lean()
    res.json({
      keys: keys.map((k) => ({
        id: String(k._id),
        name: k.name,
        prefix: k.prefix,
        active: k.active,
        deliverTo: k.deliverTo,
        brandName: k.brandName,
        brandUrl: k.brandUrl,
        sendNotification: k.sendNotification,
        sendConfirmation: k.sendConfirmation,
        allowOverrides: k.allowOverrides,
        notificationTemplateId: k.notificationTemplateId
          ? String(k.notificationTemplateId)
          : null,
        confirmationTemplateId: k.confirmationTemplateId
          ? String(k.confirmationTemplateId)
          : null,
        notes: k.notes,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
        updatedAt: k.updatedAt,
      })),
    })
  })
)

const createSchema = z.object({
  name: z.string().min(1).max(120),
  deliverTo: z.string().email().optional().nullable(),
  brandName: z.string().max(120).optional().nullable(),
  brandUrl: z.string().url().optional().nullable().or(z.literal("")),
  sendNotification: z.boolean().optional(),
  sendConfirmation: z.boolean().optional(),
  allowOverrides: z.boolean().optional(),
  notificationTemplateId: z.string().optional().nullable(),
  confirmationTemplateId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional(),
})

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body)
    const { raw, prefix, hash } = generateApiKey()
    const ApiKey = getApiKeyModel()
    const doc = await ApiKey.create({
      name: body.name,
      prefix,
      keyHash: hash,
      active: true,
      deliverTo: body.deliverTo || null,
      brandName: body.brandName || null,
      brandUrl: body.brandUrl || null,
      sendNotification: body.sendNotification ?? true,
      sendConfirmation: body.sendConfirmation ?? true,
      allowOverrides: body.allowOverrides ?? true,
      notificationTemplateId: body.notificationTemplateId || null,
      confirmationTemplateId: body.confirmationTemplateId || null,
      notes: body.notes || "",
    })
    res.status(201).json({
      key: {
        id: String(doc._id),
        name: doc.name,
        prefix: doc.prefix,
        /** Shown once — store it securely */
        secret: raw,
        active: doc.active,
      },
    })
  })
)

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = createSchema.partial().extend({
      active: z.boolean().optional(),
    }).parse(req.body)
    const ApiKey = getApiKeyModel()
    const doc = await ApiKey.findById(req.params.id)
    if (!doc) {
      res.status(404).json({ error: "API key not found" })
      return
    }
    if (body.name !== undefined) doc.name = body.name
    if (body.deliverTo !== undefined) doc.deliverTo = body.deliverTo || null
    if (body.brandName !== undefined) doc.brandName = body.brandName || null
    if (body.brandUrl !== undefined) doc.brandUrl = body.brandUrl || null
    if (body.sendNotification !== undefined) doc.sendNotification = body.sendNotification
    if (body.sendConfirmation !== undefined) doc.sendConfirmation = body.sendConfirmation
    if (body.allowOverrides !== undefined) doc.allowOverrides = body.allowOverrides
    if (body.notificationTemplateId !== undefined) {
      doc.notificationTemplateId = (body.notificationTemplateId || null) as typeof doc.notificationTemplateId
    }
    if (body.confirmationTemplateId !== undefined) {
      doc.confirmationTemplateId = (body.confirmationTemplateId || null) as typeof doc.confirmationTemplateId
    }
    if (body.notes !== undefined) doc.notes = body.notes
    if (body.active !== undefined) doc.active = body.active
    await doc.save()
    res.json({ ok: true, id: String(doc._id) })
  })
)

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const ApiKey = getApiKeyModel()
    const result = await ApiKey.findByIdAndDelete(req.params.id)
    if (!result) {
      res.status(404).json({ error: "API key not found" })
      return
    }
    res.json({ ok: true })
  })
)

export default router
