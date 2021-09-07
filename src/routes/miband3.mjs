'use strict'

/**
* This provides the API endpoints for the miband data of the participant.
*/

import express from 'express'
import passport from 'passport'
import { DAO } from '../DAO/DAO.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'

const router = express.Router()

export default async function () {
  // Get all miband data
  // query params: studyKey to filter by study
  router.get('/miband3Data', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      if (req.user.role === 'researcher') {
        // extra check about the teams
        if (req.query.teamKey) {
          const team = await DAO.getOneTeam(req.query.teamKey)
          if (!team.researchersKeys.includes(req.user._key)) return res.sendStatus(403)
          else {
            const miband3Data = await DAO.getAllMiband3Data()
            res.send(miband3Data)
          }
        }
        if (req.query.studyKey) {
          const team = await DAO.getAllTeams(req.user._key, req.query.studyKey)
          if (team.length === 0) return res.sendStatus(403)
          else {
            const miband3Data = await DAO.getMiband3DataByStudy(req.query.studyKey)
            res.send(miband3Data)
          }
        }
      } else if (req.user.role === 'participant') {
        const miband3Data = await DAO.getMiband3DataByUser(req.user._key)
        res.send(miband3Data)
      }
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve Miband3Data data')
      res.sendStatus(500)
    }
  })

  // Get miband3 data for a user
  router.get('/miband3Data/:userKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      const miband3Data = await DAO.getMiband3DataByUser(req.params.userKey)
      res.send(miband3Data)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve Miband3Data data')
      res.sendStatus(500)
    }
  })

  // Get miband3 data for a study for a user
  router.get('/miband3Data/:userKey/:studyKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      const miband3Data = await DAO.getMiband3DataByUserAndStudy(req.params.userKey, req.params.studyKey)
      res.send(miband3Data)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve Miband3Data Data ')
      res.sendStatus(500)
    }
  })

  router.post('/miband3Data', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newMiband3Data = req.body
    if (req.user.role !== 'participant') return res.sendStatus(403)
    newMiband3Data.userKey = req.user._key
    if (!newMiband3Data.createdTS) newMiband3Data.createdTS = new Date()
    try {
      newMiband3Data = await DAO.createMiband3Data(newMiband3Data)
      // also update task status
      const participant = await DAO.getParticipantByUserKey(req.user._key)
      if (!participant) return res.status(404)

      const study = participant.studies.find((s) => {
        return s.studyKey === newMiband3Data.studyKey
      })
      if (!study) return res.status(400)
      const taskItem = study.taskItemsConsent.find(ti => ti.taskId === newMiband3Data.taskId)
      if (!taskItem) return res.status(400)
      taskItem.lastExecuted = newMiband3Data.createdTS
      // update the participant
      await DAO.replaceParticipant(participant._key, participant)
      res.sendStatus(200)
      applogger.info({ userKey: req.user._key, taskId: newMiband3Data.taskId, studyKey: newMiband3Data.studyKey }, 'Participant has sent miband data')
      auditLogger.log('Miband3DataCreated', req.user._key, newMiband3Data.studyKey, newMiband3Data.taskId, 'Miband3Data data created by participant with key ' + participant._key + ' for study with key ' + newMiband3Data.studyKey, 'Miband3Data', newMiband3Data._key, newMiband3Data)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new Miband3Data Data')
      res.sendStatus(500)
    }
  })

  return router
}
