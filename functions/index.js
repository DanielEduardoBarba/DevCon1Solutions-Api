import express from "express"
import cors from "cors"
import functions from "firebase-functions"
import { transporter, buildContactEmail } from "./utils/mailer.js"
import { config } from "./utils/config.js"

const app = express()
app.use(express.json())
app.use(cors())

app.post("/devcon/contact/form", (req, res) => {
  const { key, email, phone, name, comment } = req.body
  if (key != config.key) {
    return res.status(401).send({ response: "Not AUTHORIZED!" })
  }

  const { subject, text, html } = buildContactEmail({ name, email, phone, comment })

  const mailContent = {
    from: `"${config.brand.name}" <${config.transporter_auth.user}>`,
    to: config.transporter_deliver_to,
    replyTo: email || undefined,
    subject,
    text,
    html,
  }

  transporter.sendMail(mailContent, (error, info) => {
    if (error) {
      console.error("Error sending email:", error)
      res.status(500).send({ response: "Error sending message..." })
    } else {
      console.log("Email sent:", info.response)
      res.status(200).send({ response: "Message sent successfully! We will contact you shortly" })
    }
  })
})

export const api = functions.https.onRequest(app)
