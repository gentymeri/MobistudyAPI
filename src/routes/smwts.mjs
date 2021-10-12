'use strict'

/**
* This provides the API endpoints for the SMWT of the participant.
*/

import express from 'express'
import passport from 'passport'
import { DAO } from '../DAO/DAO.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'
import { saveAttachment } from '../services/attachments.mjs'

const router = express.Router()

export default async function () {
  // Get all SMWT data
  // query params: studyKey to filter by study
  router.get('/SMWTData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      if (req.user.role === 'researcher') {
        if (req.user.role === 'researcher') {
          const team = await DAO.getAllTeams(req.user._key, req.query.studyKey)
          if (team.length === 0) return res.sendStatus(403)
          else {
            const smwts = await DAO.getSmwtsDataByStudy(req.query.studyKey)
            res.send(smwts)
          }
        } else if (req.user.role === 'participant') {
          const smwts = await DAO.getSmwtsByUser(req.user._key)
          res.send(smwts)
        } else {
          // admin
          const smwts = await DAO.getAllSmwts()
          res.send(smwts)
        }
      } else if (req.user.role === 'participant') {
        const storeData = await DAO.getSmwtsByUser(req.user._key)
        res.send(storeData)
      }
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retriev smwt data')
      res.sendStatus(500)
    }
  })

  router.post('/SMWTData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newSmwt = req.body
    if (req.user.role !== 'participant') return res.sendStatus(403)
    newSmwt.userKey = req.user._key
    if (!newSmwt.createdTS) newSmwt.createdTS = new Date()
    let trans
    try {
      const participant = await DAO.getParticipantByUserKey(req.user._key)
      if (!participant) return res.sendStatus(404)
      const study = participant.studies.find((s) => {
        return s.studyKey === newSmwt.studyKey
      })
      if (!study) return res.sendStatus(400)
      const taskItem = study.taskItemsConsent.find(ti => ti.taskId === newSmwt.taskId)
      if (!taskItem) return res.sendStatus(400)

      trans = await DAO.startTransaction([DAO.smwtTransaction(), DAO.participantsTransaction()])

      // separate raw data from the object stored on the database
      const positions = newSmwt.positions
      delete newSmwt.positions
      const steps = newSmwt.steps
      delete newSmwt.steps

      // store the data on the database
      newSmwt = await DAO.createSmwt(newSmwt, trans)

      // save the attachments
      const positionsFilename = 'positions_' + newSmwt._key + '.json'
      let writer = await saveAttachment(newSmwt.userKey, newSmwt.studyKey, newSmwt.taskId, positionsFilename)
      await writer.writeChunk(JSON.stringify(positions))
      await writer.end()
      const stepsFilename = 'steps_' + newSmwt._key + '.json'
      writer = await saveAttachment(newSmwt.userKey, newSmwt.studyKey, newSmwt.taskId, stepsFilename)
      await writer.writeChunk(JSON.stringify(steps))
      await writer.end()

      // save the filename
      newSmwt.attachments = [positionsFilename, stepsFilename]
      newSmwt = await DAO.replaceSmwt(newSmwt._key, newSmwt, trans)

      // also update task status
      taskItem.lastExecuted = newSmwt.createdTS
      // update the participant
      await DAO.replaceParticipant(participant._key, participant, trans)

      // all done now
      DAO.endTransaction(trans)

      res.sendStatus(200)
      applogger.info({ userKey: req.user._key, taskId: newSmwt.taskId, studyKey: newSmwt.studyKey }, 'Participant has sent a new smwt')
      auditLogger.log('SMWTDataCreated', req.user._key, newSmwt.studyKey, newSmwt.taskId, 'Smwt data created by participant with key ' + participant._key + ' for study with key ' + newSmwt.studyKey, 'SMWTData', newSmwt._key, newSmwt)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new smwt')
      res.sendStatus(500)
    }
  })

  return router
}
