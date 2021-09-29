'use strict'
/**
* This provides the API endpoints for the Sony mSafety integration
*/

import express from 'express'
import { open as fsOpen, stat as fsStat, mkdir as fsMkdir } from 'fs/promises'
import { applogger } from '../services/logger.mjs'
import getConfig from '../services/config.mjs'

const router = express.Router()
const UPLOADSDIR = 'tasksuploads'
const MSAFETYSUBDIR = 'msafety'

export default async function () {
  const config = getConfig()
  const msafetyDir = UPLOADSDIR + '/' + MSAFETYSUBDIR + '/'

  // create the msafety subfolder
  try {
    await fsStat(UPLOADSDIR + '/' + MSAFETYSUBDIR)
  } catch (err) {
    fsMkdir(msafetyDir, { recursive: true })
  }
  // webhook for mSafety data
  router.post('/msafety/webhook/', async function (req, res) {
    // temporary implementation, just writes any message to file
    const ts = new Date().getTime()
    let filehandle
    // parse the data and check the auth code
    if (req.headers.authkey === config.mSafety.webhookAuthKey) {
      if (req.body.pubDataItems) {
        for (const pubdata of req.body.pubDataItems) {
          if (pubdata.type === 'device' && pubdata.event === 'sensors') {
            const deviceId = pubdata.deviceId

            // create the device-specific subfolder
            const deviceDir = msafetyDir + deviceId
            try {
              await fsStat(deviceDir)
            } catch (err) {
              fsMkdir(deviceDir, { recursive: true })
            }

            if (deviceId) {
              const filename = '/sensor_' + deviceId + '_' + ts + '.json'
              try {
                filehandle = await fsOpen(deviceDir + filename, 'w')
                const text = JSON.stringify(pubdata.jsonData)
                await filehandle.writeFile(text)
              } catch (err) {
                console.error(err)
                applogger.error(err, 'cannot save sensors data mSafety file' + filename)
              } finally {
                if (filehandle) await filehandle.close()
              }
            }
          }
        }
      } else {
        const filename = '/request_' + ts + '.txt'
        applogger.debug('mSafety strange packet received, storing it raw on ' + filename)
        try {
          filehandle = await fsOpen(msafetyDir + filename, 'w')
          const text = JSON.stringify({
            headers: req.headers,
            body: req.body
          })
          await filehandle.writeFile(text)
          res.sendStatus(200)
        } catch (err) {
          res.sendStatus(500)
          applogger.error(err, 'cannot save mSafety file' + filename)
        } finally {
          if (filehandle) await filehandle.close()
        }
      }
    }
  })

  return router
}
