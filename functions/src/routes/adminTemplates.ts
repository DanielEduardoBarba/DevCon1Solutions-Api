import { Router } from "express"
import { z } from "zod"
import {
  asyncHandler,
  requireAdminSession,
} from "../middleware/auth.js"
import { slugify } from "../utils/templates.js"
import { getEmailTemplateModel } from "../models/EmailTemplate.js"

const router = Router()
router.use(requireAdminSession)

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const Template = getEmailTemplateModel()
    const templates = await Template.find().sort({ type: 1, name: 1 }).lean()
    res.json({
      templates: templates.map((t) => ({
        id: String(t._id),
        name: t.name,
        slug: t.slug,
        type: t.type,
        subjectTemplate: t.subjectTemplate,
        htmlTemplate: t.htmlTemplate,
        textTemplate: t.textTemplate,
        description: t.description,
        isSystemDefault: t.isSystemDefault,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    })
  })
)

const upsertSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(64).optional(),
  type: z.enum(["notification", "confirmation", "custom"]),
  subjectTemplate: z.string().min(1),
  htmlTemplate: z.string().min(1),
  textTemplate: z.string().optional(),
  description: z.string().max(2000).optional(),
})

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = upsertSchema.parse(req.body)
    const Template = getEmailTemplateModel()
    const slug = slugify(body.slug || body.name)
    const existing = await Template.findOne({ slug })
    if (existing) {
      res.status(409).json({ error: "Slug already exists" })
      return
    }
    const doc = await Template.create({
      name: body.name,
      slug,
      type: body.type,
      subjectTemplate: body.subjectTemplate,
      htmlTemplate: body.htmlTemplate,
      textTemplate: body.textTemplate || "",
      description: body.description || "",
      isSystemDefault: false,
    })
    res.status(201).json({ id: String(doc._id), slug: doc.slug })
  })
)

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = upsertSchema.partial().parse(req.body)
    const Template = getEmailTemplateModel()
    const doc = await Template.findById(req.params.id)
    if (!doc) {
      res.status(404).json({ error: "Template not found" })
      return
    }
    if (body.name !== undefined) doc.name = body.name
    if (body.slug !== undefined) doc.slug = slugify(body.slug)
    if (body.type !== undefined) doc.type = body.type
    if (body.subjectTemplate !== undefined) doc.subjectTemplate = body.subjectTemplate
    if (body.htmlTemplate !== undefined) doc.htmlTemplate = body.htmlTemplate
    if (body.textTemplate !== undefined) doc.textTemplate = body.textTemplate
    if (body.description !== undefined) doc.description = body.description
    await doc.save()
    res.json({ ok: true, id: String(doc._id) })
  })
)

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const Template = getEmailTemplateModel()
    const doc = await Template.findById(req.params.id)
    if (!doc) {
      res.status(404).json({ error: "Template not found" })
      return
    }
    if (doc.isSystemDefault) {
      res.status(400).json({ error: "Cannot delete system default templates" })
      return
    }
    await doc.deleteOne()
    res.json({ ok: true })
  })
)

export default router
