import { existsSync, readFileSync } from "node:fs"
import { dirname, isAbsolute, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import admin from "firebase-admin"
import { env } from "../config/env.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const FUNCTIONS_ROOT = join(__dirname, "..", "..")

let initialized = false
let firestoreInstance: admin.firestore.Firestore | null = null

function resolveServiceAccountPath(): string | null {
  const configured =
    env.firebaseServiceAccountPath ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    ""

  const candidates = [
    configured
      ? isAbsolute(configured)
        ? configured
        : resolve(FUNCTIONS_ROOT, configured)
      : null,
    join(FUNCTIONS_ROOT, "secrets", "service-account.json"),
  ].filter(Boolean) as string[]

  for (const path of candidates) {
    if (existsSync(path)) return path
  }
  return null
}

export function initFirebase(): typeof admin {
  if (initialized && admin.apps.length > 0) {
    return admin
  }

  const projectId = env.firebaseProjectId
  const saPath = resolveServiceAccountPath()

  if (saPath) {
    const raw = JSON.parse(readFileSync(saPath, "utf8")) as admin.ServiceAccount & {
      project_id?: string
    }
    admin.initializeApp({
      credential: admin.credential.cert(raw),
      projectId: projectId || raw.project_id,
    })
    console.log(
      `Firebase Admin initialized with service account → project=${admin.app().options.projectId}`
    )
  } else {
    admin.initializeApp(projectId ? { projectId } : undefined)
    console.log(
      `Firebase Admin initialized with ADC → project=${admin.app().options.projectId || projectId || "(default)"}`
    )
  }

  initialized = true
  return admin
}

export function db(): admin.firestore.Firestore {
  initFirebase()
  if (!firestoreInstance) {
    firestoreInstance = admin.firestore()
    firestoreInstance.settings({ ignoreUndefinedProperties: true })
  }
  return firestoreInstance
}

export async function connectDb(): Promise<admin.firestore.Firestore> {
  const firestore = db()
  console.log(`Firestore ready (project ${admin.app().options.projectId})`)
  return firestore
}

export async function ensureDb(
  _req: unknown,
  _res: unknown,
  next: (err?: unknown) => void
): Promise<void> {
  try {
    initFirebase()
    next()
  } catch (err) {
    next(err)
  }
}

export function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate()
  }
  return null
}
