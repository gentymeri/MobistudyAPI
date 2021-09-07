'use strict'

/**
* This is just to test that everything works.
*/

import express from 'express'
const router = express.Router()

export default async function () {
  /* Just a health cehcker */
  router.get('/', async function (req, res) {
    res.send('<p>Working!!!!!</p>')
  })

  return router
}
