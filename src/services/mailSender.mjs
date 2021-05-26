import getConfig from './config.mjs'
import { applogger } from './logger.mjs'
import nodeoutlook from 'nodejs-nodemailer-outlook'

const config = getConfig()

export async function sendEmail (contact, subject, message) {
  return new Promise(async (resolve, reject) => {
    applogger.debug({ contact, subject, message }, 'sending email')
    try {
      nodeoutlook.sendEmail({
        auth: {
          user: config.outlook.user,
          pass: config.outlook.password
        },
        from: config.outlook.email,
        to: contact,
        subject: subject,
        html: message,
        text: '',
        replyTo: '',
        attachments: [],
        onError: (error) => {
          reject(error)
          applogger.error(error, 'Cannot send email to ' + contact)
        },
        onSuccess: (i) => {
          resolve()
          applogger.info(i, 'Email sent to ' + contact)
        }
      })
    } catch (error) {
      reject(error)
      console.error('Error:', error)
      applogger.error(error, 'Cannot send email to ' + contact)
    }
  })
}
