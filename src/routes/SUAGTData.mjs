'use strict'

/**
 * This provides the API endpoints for the SUAGT of the participant.
 */

import express from 'express'
import passport from 'passport'
import { DAO } from '../DAO/DAO.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'

const router = express.Router()

export default async function () {
  // Get all SUAGT data
  // query params: studyKey to filter by study
  router.get('/SUAGTData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      if (req.user.role === 'researcher') {
        // extra check about the teams
        if (req.query.teamKey) {
          const team = await DAO.getOneTeam(req.query.teamKey)
          if (!team.researchersKeys.includes(req.user._key)) return res.sendStatus(403)
          else {
            const storeData = await DAO.getAllSUAGTData()
            res.send(storeData)
          }
        }
        if (req.query.studyKey) {
          const team = await DAO.getAllTeams(req.user._key, req.query.studyKey)
          if (team.length === 0) return res.sendStatus(403)
          else {
            const storeData = await DAO.getSUAGTDataByStudy(req.query.studyKey)
            res.send(storeData)
          }
        }
      } else if (req.user.role === 'participant') {
        const storeData = await DAO.getSUAGTDataByUser(req.user._key)
        res.send(storeData)
      }
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retriev SUAGT data')
      res.sendStatus(500)
    }
  })

  // Get SUAGT data for a user
  router.get('/SUAGTData/:userKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      const storeData = await DAO.getSUAGTDataByUser(req.params.userKey)
      res.send(storeData)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve SUAGT data')
      res.sendStatus(500)
    }
  })

  // Get SUAGT data for a study for a user
  router.get('/SUAGTData/:userKey/:studyKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      const storeData = await DAO.getSUAGTDataByUserAndStudy(req.params.userKey, req.params.studyKey)
      res.send(storeData)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve SUAGT Data ')
      res.sendStatus(500)
    }
  })

  router.post('/SUAGTData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newSUAGTData = req.body
    if (req.user.role !== 'participant') return res.sendStatus(403)
    newSUAGTData.userKey = req.user._key
    if (!newSUAGTData.createdTS) newSUAGTData.createdTS = new Date()
    try {
      newSUAGTData = await DAO.createSUAGTData(newSUAGTData)
      // also update task status
      const participant = await DAO.getParticipantByUserKey(req.user._key)
      if (!participant) return res.status(404)

      const study = participant.studies.find((s) => {
        return s.studyKey === newSUAGTData.studyKey
      })
      if (!study) return res.status(400)
      const taskItem = study.taskItemsConsent.find(ti => ti.taskId === newSUAGTData.taskId)
      if (!taskItem) return res.status(400)
      taskItem.lastExecuted = newSUAGTData.createdTS
      // update the participant
      await DAO.replaceParticipant(participant._key, participant)
      res.sendStatus(200)
      applogger.info({ userKey: req.user._key, taskId: newSUAGTData.taskId, studyKey: newSUAGTData.studyKey }, 'Participant has sent SUAGT data')
      auditLogger.log('SUAGTDataCreated', req.user._key, newSUAGTData.studyKey, newSUAGTData.taskId, 'SUAGT data created by participant with key ' + participant._key + ' for study with key ' + newSUAGTData.studyKey, 'SUAGTData', newSUAGTData._key, newSUAGTData)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new SUAGT Data')
      res.sendStatus(500)
    }
  })

  return router
}
