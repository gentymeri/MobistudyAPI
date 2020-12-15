import getConfig from './config.mjs'
import { applogger } from './logger.mjs'
import nodeoutlook from 'nodejs-nodemailer-outlook'

const config = getConfig()

export async function sendEmail (contact, subject, message) {
  return new Promise(async (resolve, reject) => {
    try {
        nodeoutlook.sendEmail({
            auth: {
              user: config.outlook.email,
              pass: config.outlook.pass
            },
            from: config.outlook.email,
            to: contact,
            subject: subject,
            html: message,
            text: '',
            replyTo: '',
            attachments: [],
            onError: (e) => console.log(e),
            onSuccess: (i) => console.log(i)
        })
      } catch (error) {
        console.log('Error:', error)
        applogger.error(error, 'Cannot send email to ' + contact)
    }
  })
}
