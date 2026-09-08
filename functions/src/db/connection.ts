import mongoose from "mongoose"
import { env } from "../config/env.js"

let connecting: Promise<typeof mongoose> | null = null

export async function connectDb(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose
  }
  if (connecting) return connecting

  connecting = mongoose.connect(env.mongodbUri, {
    dbName: env.mongodbDbName,
  })

  try {
    const conn = await connecting
    console.log(`MongoDB connected (${env.mongodbDbName})`)
    return conn
  } finally {
    connecting = null
  }
}

export async function ensureDb(
  _req: unknown,
  _res: unknown,
  next: (err?: unknown) => void
): Promise<void> {
  try {
    await connectDb()
    next()
  } catch (err) {
    next(err)
  }
}
