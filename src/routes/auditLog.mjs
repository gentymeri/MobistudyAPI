'use strict'

/**
* This provides the API endpoints for the Aidit Log profiles.
*/

import express from 'express'
import passport from 'passport'
import getDB from '../DB/DB.mjs'
import { applogger } from '../services/logger.mjs'

const router = express.Router()

export default async function () {
  var db = await getDB()

  router.get('/auditlog/eventTypes', passport.authenticate('jwt', { session: false }), async function (req, res) {
    if (req.user.role !== 'admin' && req.user.role !== 'researcher') {
      res.sendStatus(403)
    } else {
      try {
        let result = await db.getLogEventTypes(req.query)
        res.send(result)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot retrieve audit log')
        res.sendStatus(500)
      }
    }
  })

  // query parameters (optional):
  // after: ISO timeStamp
  // before: ISO timeStamp
  // eventType: type of event
  // studyKey
  // taskId
  // userEmail
  // sortDirection: ASC or DESC
  // offset: for pagination
  // rowsPerPage: for pagination
  router.get('/auditlog', passport.authenticate('jwt', { session: false }), async function (req, res) {
    if (req.user.role !== 'admin' && req.user.role !== 'researcher') {
      console.log(`not a researcher`)
      res.sendStatus(403)
    } else {
      try {
        // Researcher: a study must be specified and the researcher has to be allowed to see that study
        if (req.user.role === 'researcher') {
          if (!req.query.studyKey) return res.sendStatus(400)
          let teams = await db.getAllTeams(req.user._key, req.query.studyKey)
          if (teams.length === 0) return res.sendStatus(403)
        }
        let result = await db.getAuditLogs(false,
          req.query.after,
          req.query.before,
          req.query.eventType,
          req.query.studyKey,
          req.query.taskId,
          req.query.userEmail,
          req.query.sortDirection,
          req.query.offset,
          req.query.rowsPerPage
        )
        res.send(result)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot retrieve audit log')
        res.sendStatus(500)
      }
    }
  })

  router.get('/auditlog/count', passport.authenticate('jwt', { session: false }), async function (req, res) {
    if (req.user.role !== 'admin' && req.user.role !== 'researcher') {
      res.sendStatus(403)
    } else {
      try {
        let result = await db.getAuditLogs(true,
          req.query.after,
          req.query.before,
          req.query.eventType,
          req.query.studyKey,
          req.query.taskId,
          req.query.userEmail,
          req.query.sortDirection,
          req.query.offset,
          req.query.rowsPerPage
        )
        res.send(result)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot retrieve audit log')
        res.sendStatus(500)
      }
    }
  })

  return router
}
