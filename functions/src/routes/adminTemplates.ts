import { Router } from "express"
import { z } from "zod"
import {
  asyncHandler,
  requireAdminSession,
} from "../middleware/auth.js"
import { slugify } from "../utils/templates.js"
import * as templateRepo from "../repos/templates.js"

const router = Router()
router.use(requireAdminSession)

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const templates = await templateRepo.listTemplates()
    res.json({
      templates: templates.map((t) => ({
        id: t.id,
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
    const slug = slugify(body.slug || body.name)
    const existing = await templateRepo.getTemplateBySlug(slug)
    if (existing) {
      res.status(409).json({ error: "Slug already exists" })
      return
    }
    const doc = await templateRepo.createTemplate({
      name: body.name,
      slug,
      type: body.type,
      subjectTemplate: body.subjectTemplate,
      htmlTemplate: body.htmlTemplate,
      textTemplate: body.textTemplate || "",
      description: body.description || "",
      isSystemDefault: false,
    })
    res.status(201).json({ id: doc.id, slug: doc.slug })
  })
)

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = upsertSchema.partial().parse(req.body)
    const updated = await templateRepo.updateTemplate(req.params.id, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.slug !== undefined ? { slug: slugify(body.slug) } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.subjectTemplate !== undefined
        ? { subjectTemplate: body.subjectTemplate }
        : {}),
      ...(body.htmlTemplate !== undefined ? { htmlTemplate: body.htmlTemplate } : {}),
      ...(body.textTemplate !== undefined ? { textTemplate: body.textTemplate } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
    })
    if (!updated) {
      res.status(404).json({ error: "Template not found" })
      return
    }
    res.json({ ok: true, id: updated.id })
  })
)

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const doc = await templateRepo.getTemplateById(req.params.id)
    if (!doc) {
      res.status(404).json({ error: "Template not found" })
      return
    }
    if (doc.isSystemDefault) {
      res.status(400).json({ error: "Cannot delete system default templates" })
      return
    }
    await templateRepo.deleteTemplate(req.params.id)
    res.json({ ok: true })
  })
)

export default router
