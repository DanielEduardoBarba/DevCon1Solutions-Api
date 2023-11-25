import express from "express"
import cors from "cors"
import functions from "firebase-functions"
import { transporter } from "./utils/mailer.js"
// import nodemailer from 'nodemailer'
import config from "./secrets.json" assert { type: 'json' }

// const transporter = nodemailer.createTransport({
//   service: 'Gmail',
//   auth: config.transporter_auth,
// })

const app = express()
app.use(express.json())
app.use(cors())


app.get("/form", (req, res) => {


      // Define email content
  const mailOptions = {
    from: config.transporter_auth.user,
    to: config.transporter_deliver_to,
    subject:`Contact Form:`,
    text:"I AM A TEST!!!!",
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      res.status(500).send('Error sending message...');
    } else {
      console.log('Email sent:', info.response);
      res.status(200).send('Message sent successfully! We will contact you shortly')
    }
  });

})






export const api = functions.https.onRequest(app)