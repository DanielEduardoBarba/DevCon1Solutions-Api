import { Router } from "express"
import { z } from "zod"
import {
  asyncHandler,
  requireAdminSession,
} from "../middleware/auth.js"
import { generateApiKey } from "../utils/crypto.js"
import * as apiKeysRepo from "../repos/apiKeys.js"

const router = Router()
router.use(requireAdminSession)

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const keys = await apiKeysRepo.listApiKeys()
    res.json({
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        active: k.active,
        deliverTo: k.deliverTo,
        brandName: k.brandName,
        brandUrl: k.brandUrl,
        sendNotification: k.sendNotification,
        sendConfirmation: k.sendConfirmation,
        allowOverrides: k.allowOverrides,
        notificationTemplateId: k.notificationTemplateId,
        confirmationTemplateId: k.confirmationTemplateId,
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
    const doc = await apiKeysRepo.createApiKey({
      name: body.name,
      prefix,
      keyHash: hash,
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
        id: doc.id,
        name: doc.name,
        prefix: doc.prefix,
        secret: raw,
        active: doc.active,
      },
    })
  })
)

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = createSchema
      .partial()
      .extend({ active: z.boolean().optional() })
      .parse(req.body)
    const updated = await apiKeysRepo.updateApiKey(req.params.id, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.deliverTo !== undefined ? { deliverTo: body.deliverTo || null } : {}),
      ...(body.brandName !== undefined ? { brandName: body.brandName || null } : {}),
      ...(body.brandUrl !== undefined ? { brandUrl: body.brandUrl || null } : {}),
      ...(body.sendNotification !== undefined
        ? { sendNotification: body.sendNotification }
        : {}),
      ...(body.sendConfirmation !== undefined
        ? { sendConfirmation: body.sendConfirmation }
        : {}),
      ...(body.allowOverrides !== undefined
        ? { allowOverrides: body.allowOverrides }
        : {}),
      ...(body.notificationTemplateId !== undefined
        ? { notificationTemplateId: body.notificationTemplateId || null }
        : {}),
      ...(body.confirmationTemplateId !== undefined
        ? { confirmationTemplateId: body.confirmationTemplateId || null }
        : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.active !== undefined ? { active: body.active } : {}),
    })
    if (!updated) {
      res.status(404).json({ error: "API key not found" })
      return
    }
    res.json({ ok: true, id: updated.id })
  })
)

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const ok = await apiKeysRepo.deleteApiKey(req.params.id)
    if (!ok) {
      res.status(404).json({ error: "API key not found" })
      return
    }
    res.json({ ok: true })
  })
)

export default router
