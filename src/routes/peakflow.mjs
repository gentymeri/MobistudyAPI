'use strict'

/**
* This provides the API endpoints for the PeakFlow data of the participant.
*/

import express from 'express'
import passport from 'passport'
import { DAO } from '../DAO/DAO.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'

const router = express.Router()

export default async function () {
  // Get all PeakFlow data
  // query params: studyKey to filter by study
  router.get('/peakflowData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      if (req.user.role === 'researcher') {
        // extra check about the teams
        if (req.query.teamKey) {
          const team = await DAO.getOneTeam(req.query.teamKey)
          if (!team.researchersKeys.includes(req.user._key)) return res.sendStatus(403)
          else {
            const peakflowData = await DAO.getAllPeakFlowData()
            res.send(peakflowData)
          }
        }
        if (req.query.studyKey) {
          const team = await DAO.getAllTeams(req.user._key, req.query.studyKey)
          if (team.length === 0) return res.sendStatus(403)
          else {
            const peakflowData = await DAO.getPeakFlowDataByStudy(req.query.studyKey)
            res.send(peakflowData)
          }
        }
      } else if (req.user.role === 'participant') {
        const peakflowData = await DAO.getPeakFlowDataByUser(req.user._key)
        res.send(peakflowData)
      }
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve PeakFlowData')
      res.sendStatus(500)
    }
  })

  // Get PeakFlowfor a user
  router.get('/peakflowData/:userKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      const peakflowData = await DAO.getPeakFlowDataByUser(req.params.userKey)
      res.send(peakflowData)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve PeakFlowData')
      res.sendStatus(500)
    }
  })

  // Get PeakFlow for a study for a user
  router.get('/peakflowData/:userKey/:studyKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      const peakflowData = await DAO.getPeakFlowDataByUserAndStudy(req.params.userKey, req.params.studyKey)
      res.send(peakflowData)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve PeakFlowData')
      res.sendStatus(500)
    }
  })

  router.post('/peakflowData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newPeakFlowData = req.body
    if (req.user.role !== 'participant') return res.sendStatus(403)
    newPeakFlowData.userKey = req.user._key
    if (!newPeakFlowData.createdTS) newPeakFlowData.createdTS = new Date()
    try {
      newPeakFlowData = await DAO.createPeakFlowData(newPeakFlowData)
      // also update task status

      const participant = await DAO.getParticipantByUserKey(req.user._key)
      applogger.info({ userKey: req.user._key, taskId: newPeakFlowData.taskId, studyKey: newPeakFlowData.studyKey }, 'Finding participant')
      if (!participant) return res.status(404)
      applogger.info({ userKey: req.user._key, taskId: newPeakFlowData.taskId, studyKey: newPeakFlowData.studyKey }, 'Found participant')
      const study = participant.studies.find((s) => {
        return s.studyKey === newPeakFlowData.studyKey
      })
      if (!study) return res.status(400)
      const taskItem = study.taskItemsConsent.find(ti => ti.taskId === newPeakFlowData.taskId)
      if (!taskItem) return res.status(400)
      taskItem.lastExecuted = newPeakFlowData.createdTS
      // update the participant
      await DAO.replaceParticipant(participant._key, participant)
      res.sendStatus(200)
      applogger.info({ userKey: req.user._key, taskId: newPeakFlowData.taskId, studyKey: newPeakFlowData.studyKey }, 'Participant has sent health store data')
      auditLogger.log('PeakFlowDataCreated', req.user._key, newPeakFlowData.studyKey, newPeakFlowData.taskId, 'PeakFlowData data created by participant with key ' + participant._key + ' for study with key ' + newPeakFlowData.studyKey, 'PeakFlowData', newPeakFlowData._key, newPeakFlowData)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new PeakFlowData Data')
      res.sendStatus(500)
    }
  })

  return router
}
