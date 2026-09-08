import functions from "firebase-functions"
import { createApp } from "./app.js"

let appPromise: ReturnType<typeof createApp> | null = null

async function getApp() {
  if (!appPromise) appPromise = createApp()
  return appPromise
}

export const api = functions.https.onRequest(async (req, res) => {
  const app = await getApp()
  return app(req, res)
})
