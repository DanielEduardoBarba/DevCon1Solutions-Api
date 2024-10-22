import nodemailer from 'nodemailer'
import config from "../secrets.json" assert { type: 'json' }

export const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: config.transporter_auth,

  // auth:{
  //   "user": "<email address>",
  //   "pass": "<google email pass access>"
  // }
})