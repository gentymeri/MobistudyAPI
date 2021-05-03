'use strict'

/**
* This provides the API endpoints for searching for medical words.
*/

import { getTerm } from '../services/vocabulary.mjs'
import express from 'express'
import { applogger } from '../services/logger.mjs'

const router = express.Router()

export default async function () {
  // lang can be 'en' or 'sv'
  // type can be 'substance' or 'disorder'
  // example: /vocabulary/en/disorder/search?term=heart&limit=10
  router.get('/vocabulary/:lang/:type/search', async function (req, res) {
    try {
      let lang = req.params.lang
      if (lang !== 'en' && lang !== 'sv') { // TODO: se or sv?
        res.sendStatus(400)
        return
      }

      let type = req.params.type
      if (type !== 'substance' && type !== 'disorder') {
        res.sendStatus(400)
        return
      }

      let term = req.query.term
      if (!term) {
        res.sendStatus(400)
        return
      }

      let limit = req.query.limit
      if (!limit) limit = 10 // default limit

      applogger.debug({ term, lang, type, limit }, 'Querying medical term')
      let concepts = await getTerm(term, type, lang, limit)
      res.json(concepts)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot connect to vocabulary API')
      res.sendStatus(500)
    }
  })

  return router
}
