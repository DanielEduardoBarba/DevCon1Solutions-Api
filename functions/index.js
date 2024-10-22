import express from "express"
import cors from "cors"
import functions from "firebase-functions"
import { transporter } from "./utils/mailer.js"
import config from "./secrets.json" assert { type: 'json' }

const app = express()
app.use(express.json())
app.use(cors())

app.post("/devcon/contact/form", (req, res) => {
  const { key, email, phone, name, comment } = req.body
  if (key != config.key) {

    return res.status(401).send({ response: 'Not AUTHORIZED!' })
  }
  console.log(req)

  // Define email content
  const mailContent = {
    from: config.transporter_auth.user,
    to: config.transporter_deliver_to,
    subject: `Contact Form: e:${email} p:${phone} n:${name}`,
    text: comment,
  }

  console.log("SENDING THIS:", mailContent)

  // Send the email
  transporter.sendMail(mailContent, (error, info) => {
    if (error) {
      console.error('Error sending email:', error)
      res.status(500).send({ response: 'Error sending message...' })
    } else {
      console.log('Email sent:', info.response)
      res.status(200).send({ response: 'Message sent successfully! We will contact you shortly' })
    }
  })

})


export const api = functions.https.onRequest(app)