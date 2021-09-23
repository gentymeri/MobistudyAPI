'use strict'
/**
* This provides the API endpoints for the Sony mSafety integration
*/

import express from 'express'
import { open } from 'fs/promises'

const router = express.Router()

export default async function () {
  // webhook for mSafety data
  router.post('/msafety/webhook/', async function (req, res) {
    // temporary implementation, just writes any message to file
    const ts = new Date().getTime()
    let filehandle
    try {
      filehandle = await open('request_' + ts + '.txt', 'w')
      const text = JSON.stringify({
        headers: req.headers,
        body: req.body
      })
      await filehandle.writeFile(text)
      res.sendStatus(200)
    } finally {
      if (filehandle) await filehandle.close()
    }
  })

  return router
}
