'use strict'

/**
* This provides the API endpoints for the health data of the participant.
*/

import express from 'express'
import passport from 'passport'
import { DAO } from '../DAO/DAO.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'

const router = express.Router()

export default async function () {
  // Get all health store data
  // query params: studyKey to filter by study
  router.get('/healthStoreData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      if (req.user.role === 'researcher') {
        // extra check about the teams
        if (req.query.teamKey) {
          const team = await DAO.getOneTeam(req.query.teamKey)
          if (!team.researchersKeys.includes(req.user._key)) return res.sendStatus(403)
          else {
            const storeData = await DAO.getAllHealthStoreData()
            res.send(storeData)
          }
        }
        if (req.query.studyKey) {
          const team = await DAO.getAllTeams(req.user._key, req.query.studyKey)
          if (team.length === 0) return res.sendStatus(403)
          else {
            const storeData = await DAO.getHealthStoreDataByStudy(req.query.studyKey)
            res.send(storeData)
          }
        }
      } else if (req.user.role === 'participant') {
        const storeData = await DAO.getHealthStoreDataByUser(req.user._key)
        res.send(storeData)
      }
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve healthStore data')
      res.sendStatus(500)
    }
  })

  // Get health store data for a user
  router.get('/healthStoreData/:userKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      const storeData = await DAO.getHealthStoreDataByUser(req.params.userKey)
      res.send(storeData)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve healthStore data')
      res.sendStatus(500)
    }
  })

  // Get health store data for a study for a user
  router.get('/healthStoreData/:userKey/:studyKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      const storeData = await DAO.getHealthStoreDataByUserAndStudy(req.params.userKey, req.params.studyKey)
      res.send(storeData)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve healthStore Data ')
      res.sendStatus(500)
    }
  })

  router.post('/healthStoreData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newHealthStoreData = req.body
    if (req.user.role !== 'participant') return res.sendStatus(403)
    newHealthStoreData.userKey = req.user._key
    if (!newHealthStoreData.createdTS) newHealthStoreData.createdTS = new Date()
    try {
      newHealthStoreData = await DAO.createHealthStoreData(newHealthStoreData)
      // also update task status
      const participant = await DAO.getParticipantByUserKey(req.user._key)
      if (!participant) return res.status(404)

      const study = participant.studies.find((s) => {
        return s.studyKey === newHealthStoreData.studyKey
      })
      if (!study) return res.status(400)
      const taskItem = study.taskItemsConsent.find(ti => ti.taskId === newHealthStoreData.taskId)
      if (!taskItem) return res.status(400)
      taskItem.lastExecuted = newHealthStoreData.createdTS
      // update the participant
      await DAO.replaceParticipant(participant._key, participant)
      res.sendStatus(200)
      applogger.info({ userKey: req.user._key, taskId: newHealthStoreData.taskId, studyKey: newHealthStoreData.studyKey }, 'Participant has sent health store data')
      auditLogger.log('healthStoreDataCreated', req.user._key, newHealthStoreData.studyKey, newHealthStoreData.taskId, 'HealthStore data created by participant with key ' + participant._key + ' for study with key ' + newHealthStoreData.studyKey, 'healthStoreData', newHealthStoreData._key, newHealthStoreData)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new HealthStore Data')
      res.sendStatus(500)
    }
  })

  return router
}
