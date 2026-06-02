import express from "express"
import cors from "cors"
import functions from "firebase-functions"
import {
  transporter,
  buildContactEmail,
  buildContactConfirmationEmail,
} from "./utils/mailer.js"
import { config } from "./utils/config.js"

const app = express()
app.use(express.json())
app.use(cors())

app.post("/devcon/contact/form", async (req, res) => {
  const { key, email, phone, name, comment } = req.body
  if (key != config.key) {
    return res.status(401).send({ response: "Not AUTHORIZED!" })
  }

  const fromAddress = `"${config.brand.name}" <${config.transporter_auth.user}>`

  const notification = buildContactEmail({ name, email, phone, comment })
  const notificationMail = {
    from: fromAddress,
    to: config.transporter_deliver_to,
    replyTo: email || undefined,
    subject: notification.subject,
    text: notification.text,
    html: notification.html,
  }

  try {
    const notificationInfo = await transporter.sendMail(notificationMail)
    console.log("Notification email sent:", notificationInfo.response)
  } catch (error) {
    console.error("Error sending notification email:", error)
    return res.status(500).send({ response: "Error sending message..." })
  }

  // Best-effort confirmation back to the visitor. Failure here should not
  // surface as an API error because the team has already received the message.
  if (email) {
    const confirmation = buildContactConfirmationEmail({ name, email, phone, comment })
    const confirmationMail = {
      from: fromAddress,
      to: email,
      replyTo: config.transporter_deliver_to,
      subject: confirmation.subject,
      text: confirmation.text,
      html: confirmation.html,
    }

    try {
      const confirmationInfo = await transporter.sendMail(confirmationMail)
      console.log("Confirmation email sent:", confirmationInfo.response)
    } catch (error) {
      console.error("Error sending confirmation email:", error)
    }
  }

  return res
    .status(200)
    .send({ response: "Message sent successfully! We will contact you shortly" })
})

export const api = functions.https.onRequest(app)
