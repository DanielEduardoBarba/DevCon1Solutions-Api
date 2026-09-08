import express, { type Request, type Response, type NextFunction } from "express"
import cors from "cors"
import { ZodError } from "zod"
import { env } from "./config/env.js"
import { connectDb, ensureDb } from "./db/firebase.js"
import { bootstrapDefaults } from "./services/bootstrap.js"
import contactRouter from "./routes/contact.js"
import adminAuthRouter from "./routes/adminAuth.js"
import adminKeysRouter from "./routes/adminKeys.js"
import adminMailerRouter from "./routes/adminMailer.js"
import adminTemplatesRouter from "./routes/adminTemplates.js"

export async function createApp() {
  await connectDb()
  await bootstrapDefaults()

  const app = express()
  app.disable("x-powered-by")
  app.use(express.json({ limit: "1mb" }))

  const corsOrigins = env.corsOrigins
  app.use(
    cors({
      origin: corsOrigins.includes("*")
        ? true
        : (origin, cb) => {
            if (!origin || corsOrigins.includes(origin)) cb(null, true)
            else cb(new Error("Not allowed by CORS"))
          },
      credentials: true,
    })
  )

  app.use(ensureDb)

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "devcon1solutions-api" })
  })

  // Generic contact mailer (API key required)
  app.use("/v1/contact", contactRouter)
  // Backward-compatible path used by the public site
  app.use("/devcon/contact", contactRouter)

  // Console admin API
  app.use("/admin/auth", adminAuthRouter)
  app.use("/admin/keys", adminKeysRouter)
  app.use("/admin/mailer", adminMailerRouter)
  app.use("/admin/templates", adminTemplatesRouter)

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" })
  })

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: "validation_error",
        details: err.flatten(),
      })
      return
    }
    const status =
      typeof err === "object" &&
      err !== null &&
      "status" in err &&
      typeof (err as { status: unknown }).status === "number"
        ? (err as { status: number }).status
        : 500
    const message =
      err instanceof Error ? err.message : "Internal server error"
    if (status >= 500) console.error(err)
    res.status(status).json({ error: message })
  })

  return app
}
