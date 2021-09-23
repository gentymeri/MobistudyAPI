'use strict'
/**
* This provides the API endpoints for the Sony mSafety integration
*/

import express from 'express'
import { open } from 'fs/promises'
import { applogger } from '../services/logger.mjs'

const router = express.Router()
const UPLOADSDIR = 'tasksuploads'

export default async function () {
  // webhook for mSafety data
  router.post('/msafety/webhook/', async function (req, res) {
    // temporary implementation, just writes any message to file
    const ts = new Date().getTime()
    const filename = '/request_' + ts + '.txt'
    applogger.debug('mSafety storing file ' + filename)
    let filehandle
    try {
      filehandle = await open(UPLOADSDIR + filename, 'w')
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
  })

  return router
}
