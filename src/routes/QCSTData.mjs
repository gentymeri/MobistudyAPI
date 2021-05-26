'use strict'

/**
* This provides the API endpoints for the QCST of the participant.
*/

import express from 'express'
import passport from 'passport'
import { DAO } from '../DAO/DAO.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'

const router = express.Router()

export default async function () {

  // Get all QCST data
  // query params: studyKey to filter by study
  router.get('/QCSTData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      if (req.user.role === 'researcher') {
        // extra check about the teams
        if (req.query.teamKey) {
          let team = await DAO.getOneTeam(req.query.teamKey)
          if (!team.researchersKeys.includes(req.user._key)) return res.sendStatus(403)
          else {
            let storeData = await DAO.getAllQCSTData()
            res.send(storeData)
          }
        }
        if (req.query.studyKey) {
          let team = await DAO.getAllTeams(req.user._key, req.query.studyKey)
          if (team.length === 0) return res.sendStatus(403)
          else {
            let storeData = await DAO.getQCSTDataByStudy(req.query.studyKey)
            res.send(storeData)
          }
        }
      } else if (req.user.role === 'participant') {
        let storeData = await DAO.getQCSTDataByUser(req.user._key)
        res.send(storeData)
      }
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retriev QCST data')
      res.sendStatus(500)
    }
  })

  // Get QCST data for a user
  router.get('/QCSTData/:userKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      let storeData = await DAO.getQCSTDataByUser(req.params.userKey)
      res.send(storeData)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve QCST data')
      res.sendStatus(500)
    }
  })

  // Get QCST data for a study for a user
  router.get('/QCSTData/:userKey/:studyKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      let storeData = await DAO.getQCSTDataByUserAndStudy(req.params.userKey, req.params.studyKey)
      res.send(storeData)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve QCST Data ')
      res.sendStatus(500)
    }
  })

  router.post('/QCSTData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newQCSTData = req.body
    if (req.user.role !== 'participant') return res.sendStatus(403)
    newQCSTData.userKey = req.user._key
    if (!newQCSTData.createdTS) newQCSTData.createdTS = new Date()
    try {
      newQCSTData = await DAO.createQCSTData(newQCSTData)
      // also update task status
      let participant = await DAO.getParticipantByUserKey(req.user._key)
      if (!participant) return res.status(404)

      let study = participant.studies.find((s) => {
        return s.studyKey === newQCSTData.studyKey
      })
      if (!study) return res.status(400)
      let taskItem = study.taskItemsConsent.find(ti => ti.taskId === newQCSTData.taskId)
      if (!taskItem) return res.status(400)
      taskItem.lastExecuted = newQCSTData.createdTS
      // update the participant
      await DAO.replaceParticipant(participant._key, participant)
      res.sendStatus(200)
      applogger.info({ userKey: req.user._key, taskId: newQCSTData.taskId, studyKey: newQCSTData.studyKey }, 'Participant has sent QCST data')
      auditLogger.log('QCSTDataCreated', req.user._key, newQCSTData.studyKey, newQCSTData.taskId, 'QCST data created by participant with key ' + participant._key + ' for study with key ' + newQCSTData.studyKey, 'QCSTData', newQCSTData._key, newQCSTData)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new QCST Data')
      res.sendStatus(500)
    }
  })

  return router
}
