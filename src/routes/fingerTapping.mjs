'use strict'

/**
 * This provides the API endpoints for the tapping data of the participant.
 */

import express from 'express'
import passport from 'passport'
import { DAO } from '../DAO/DAO.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'

const router = express.Router()

export default async function () {
  // Get all tapping data
  // query params: studyKey to filter by study
  router.get('/fingerTapping', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      if (req.user.role === 'researcher') {
        // extra check about the teams
        if (req.query.teamKey) {
          const team = await DAO.getOneTeam(req.query.teamKey)
          if (!team.researchersKeys.includes(req.user._key)) return res.sendStatus(403)
          else {
            const tappingData = await DAO.getAllFingerTappings()
            res.send(tappingData)
          }
        }
        if (req.query.studyKey) {
          const team = await DAO.getAllTeams(req.user._key, req.query.studyKey)
          if (team.length === 0) return res.sendStatus(403)
          else {
            const tappingData = await DAO.getFingerTappingsByStudy(req.query.studyKey)
            res.send(tappingData)
          }
        }
      } else if (req.user.role === 'participant') {
        const tappingData = await DAO.getFingerTappingsByUser(req.user._key)
        res.send(tappingData)
      }
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve tappingData')
      res.sendStatus(500)
    }
  })

  // Get tappingfor a user
  router.get('/fingerTapping/:userKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      const tappingData = await DAO.getFingerTappingsByUser(req.params.userKey)
      res.send(tappingData)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve tappingData')
      res.sendStatus(500)
    }
  })

  // Get tapping for a study for a user
  router.get('/fingerTapping/:userKey/:studyKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      const tappingData = await DAO.getFingerTappingsByUserAndStudy(req.params.userKey, req.params.studyKey)
      res.send(tappingData)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve tappingData')
      res.sendStatus(500)
    }
  })

  router.post('/fingerTapping', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newtappingData = req.body
    if (req.user.role !== 'participant') return res.sendStatus(403)
    newtappingData.userKey = req.user._key
    if (!newtappingData.createdTS) newtappingData.createdTS = new Date()
    try {
      newtappingData = await DAO.createFingerTapping(newtappingData)
      // also update task status

      const participant = await DAO.getParticipantByUserKey(req.user._key)
      if (!participant) return res.status(404)
      const study = participant.studies.find((s) => {
        return s.studyKey === newtappingData.studyKey
      })
      if (!study) return res.status(400)
      const taskItem = study.taskItemsConsent.find(ti => ti.taskId === newtappingData.taskId)
      if (!taskItem) return res.status(400)
      taskItem.lastExecuted = newtappingData.createdTS
      // update the participant
      await DAO.replaceParticipant(participant._key, participant)
      res.sendStatus(200)
      applogger.info({ userKey: req.user._key, taskId: newtappingData.taskId, studyKey: newtappingData.studyKey }, 'Participant has sent finger tapping data')
      auditLogger.log('fingerTappingCreated', req.user._key, newtappingData.studyKey, newtappingData.taskId, 'Finger tapping data created by participant with key ' + participant._key + ' for study with key ' + newtappingData.studyKey, 'fingerTapping', newtappingData._key, newtappingData)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new tappingData Data')
      res.sendStatus(500)
    }
  })

  return router
}
