'use strict'

/**
* This provides the API endpoints for the PO60 pulseoximeter data of the participant.
*/

import express from 'express'
import passport from 'passport'
import getDB from '../DB/DB.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'

const router = express.Router()

export default async function () {
  var db = await getDB()

  // Get all PO60 data
  // query params: studyKey to filter by study
  router.get('/po60Data', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      if (req.user.role === 'researcher') {
        // extra check about the teams
        if (req.query.teamKey) {
          let team = await db.getOneTeam(req.query.teamKey)
          if (!team.researchersKeys.includes(req.user._key)) return res.sendStatus(403)
          else {
            let po60Data = await db.getAllPO60Data()
            res.send(po60Data)
          }
        }
        if (req.query.studyKey) {
          let team = await db.getAllTeams(req.user._key, req.query.studyKey)
          if (team.length === 0) return res.sendStatus(403)
          else {
            let po60Data = await db.getPO60DataByStudy(req.query.studyKey)
            res.send(po60Data)
          }
        }
      } else if (req.user.role === 'participant') {
        let po60Data = await db.getPO60DataByUser(req.user._key)
        res.send(po60Data)
      }
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve PO60Data')
      res.sendStatus(500)
    }
  })

  // Get PO60for a user
  router.get('/po60Data/:userKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      let po60Data = await db.getPO60DataByUser(req.params.userKey)
      res.send(po60Data)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve PO60Data')
      res.sendStatus(500)
    }
  })

  // Get PO60 for a study for a user
  router.get('/po60Data/:userKey/:studyKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      let po60Data = await db.getPO60DataByUserAndStudy(req.params.userKey, req.params.studyKey)
      res.send(po60Data)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve PO60Data')
      res.sendStatus(500)
    }
  })

  router.post('/po60Data', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newPO60Data = req.body
    if (req.user.role !== 'participant') return res.sendStatus(403)
    newPO60Data.userKey = req.user._key
    if(!newPO60Data.createdTS) newPO60Data.createdTS = new Date()
    try {
      newPO60Data = await db.createPO60Data(newPO60Data)
      // also update task status
      
      let participant = await db.getParticipantByUserKey(req.user._key)
      applogger.info({ userKey: req.user._key, taskId: newPO60Data.taskId, studyKey: newPO60Data.studyKey }, 'Finding participant')
      if (!participant) return res.status(404)
      applogger.info({ userKey: req.user._key, taskId: newPO60Data.taskId, studyKey: newPO60Data.studyKey }, 'Found participant')
      let study = participant.studies.find((s) => {
        return s.studyKey === newPO60Data.studyKey
      })
      if (!study) return res.status(400)
      let taskItem = study.taskItemsConsent.find(ti => ti.taskId === newPO60Data.taskId)
      if (!taskItem) return res.status(400)
      taskItem.lastExecuted = newPO60Data.createdTS
      // update the participant
      await db.replaceParticipant(participant._key, participant)
      res.sendStatus(200)
      applogger.info({ userKey: req.user._key, taskId: newPO60Data.taskId, studyKey: newPO60Data.studyKey }, 'Participant has sent health store data')
      auditLogger.log('PO60DataCreated', req.user._key, newPO60Data.studyKey, newPO60Data.taskId, 'PO60Data data created by participant with key ' + participant._key + ' for study with key ' + newPO60Data.studyKey, 'PO60Data', newPO60Data._key, newPO60Data)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new PO60Data Data')
      res.sendStatus(500)
    }
  })

  return router
}