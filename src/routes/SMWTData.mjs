'use strict'

/**
* This provides the API endpoints for the SMWT of the participant.
*/

import express from 'express'
import passport from 'passport'
import { DAO } from '../DAO/DAO.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'

const router = express.Router()

export default async function () {
  // Get all SMWT data
  // query params: studyKey to filter by study
  router.get('/SMWTData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      if (req.user.role === 'researcher') {
        // extra check about the teams
        if (req.query.teamKey) {
          const team = await DAO.getOneTeam(req.query.teamKey)
          if (!team.researchersKeys.includes(req.user._key)) return res.sendStatus(403)
          else {
            const storeData = await DAO.getAllSMWTData()
            res.send(storeData)
          }
        }
        if (req.query.studyKey) {
          const team = await DAO.getAllTeams(req.user._key, req.query.studyKey)
          if (team.length === 0) return res.sendStatus(403)
          else {
            const storeData = await DAO.getSMWTDataByStudy(req.query.studyKey)
            res.send(storeData)
          }
        }
      } else if (req.user.role === 'participant') {
        const storeData = await DAO.getSMWTDataByUser(req.user._key)
        res.send(storeData)
      }
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retriev SMWT data')
      res.sendStatus(500)
    }
  })

  // Get SMWT data for a user
  router.get('/SMWTData/:userKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      const storeData = await DAO.getSMWTDataByUser(req.params.userKey)
      res.send(storeData)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve SMWT data')
      res.sendStatus(500)
    }
  })

  // Get SMWT data for a study for a user
  router.get('/SMWTData/:userKey/:studyKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      const storeData = await DAO.getSMWTDataByUserAndStudy(req.params.userKey, req.params.studyKey)
      res.send(storeData)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve SMWT Data ')
      res.sendStatus(500)
    }
  })

  router.post('/SMWTData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newSMWTData = req.body
    if (req.user.role !== 'participant') return res.sendStatus(403)
    newSMWTData.userKey = req.user._key
    if (!newSMWTData.createdTS) newSMWTData.createdTS = new Date()
    try {
      newSMWTData = await DAO.createSMWTData(newSMWTData)
      // also update task status
      const participant = await DAO.getParticipantByUserKey(req.user._key)
      if (!participant) return res.status(404)

      const study = participant.studies.find((s) => {
        return s.studyKey === newSMWTData.studyKey
      })
      if (!study) return res.status(400)
      const taskItem = study.taskItemsConsent.find(ti => ti.taskId === newSMWTData.taskId)
      if (!taskItem) return res.status(400)
      taskItem.lastExecuted = newSMWTData.createdTS
      // update the participant
      await DAO.replaceParticipant(participant._key, participant)
      res.sendStatus(200)
      applogger.info({ userKey: req.user._key, taskId: newSMWTData.taskId, studyKey: newSMWTData.studyKey }, 'Participant has sent SMWT data')
      auditLogger.log('SMWTDataCreated', req.user._key, newSMWTData.studyKey, newSMWTData.taskId, 'SMWT data created by participant with key ' + participant._key + ' for study with key ' + newSMWTData.studyKey, 'SMWTData', newSMWTData._key, newSMWTData)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new SMWT Data')
      res.sendStatus(500)
    }
  })

  return router
}
