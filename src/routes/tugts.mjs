'use strict'

/**
 * This provides the API endpoints for the TUGT of the participant.
 */

import express from 'express'
import passport from 'passport'
import { DAO } from '../DAO/DAO.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'
import { saveAttachment } from '../services/attachments.mjs'

const router = express.Router()

export default async function () {
  // Get all TUGT data
  // query params: studyKey to filter by study
  router.get('/TUGTData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      if (req.user.role === 'researcher') {
        if (req.user.role === 'researcher') {
          const team = await DAO.getAllTeams(req.user._key, req.query.studyKey)
          if (team.length === 0) return res.sendStatus(403)
          else {
            const tugts = await DAO.getTugtsDataByStudy(req.query.studyKey)
            res.send(tugts)
          }
        } else if (req.user.role === 'participant') {
          const tugts = await DAO.getTugtsByUser(req.user._key)
          res.send(tugts)
        } else {
          // admin
          const tugts = await DAO.getAllTugts()
          res.send(tugts)
        }
      } else if (req.user.role === 'participant') {
        const storeData = await DAO.getTugtsByUser(req.user._key)
        res.send(storeData)
      }
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retriev tugt data')
      res.sendStatus(500)
    }
  })

  router.post('/TUGTData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newTugt = req.body
    if (req.user.role !== 'participant') return res.sendStatus(403)
    newTugt.userKey = req.user._key
    if (!newTugt.createdTS) newTugt.createdTS = new Date()
    let trans
    try {
      const participant = await DAO.getParticipantByUserKey(req.user._key)
      if (!participant) return res.sendStatus(404)
      const study = participant.studies.find((s) => {
        return s.studyKey === newTugt.studyKey
      })
      if (!study) return res.sendStatus(400)
      const taskItem = study.taskItemsConsent.find(ti => ti.taskId === newTugt.taskId)
      if (!taskItem) return res.sendStatus(400)

      trans = await DAO.startTransaction([DAO.tugtTransaction(), DAO.participantsTransaction()])

      // separate raw data from the object stored on the database
      const positions = newTugt.positions
      delete newTugt.positions
      const steps = newTugt.steps
      delete newTugt.steps

      // store the data on the database
      newTugt = await DAO.createTugt(newTugt, trans)

      // save the attachments
      const positionsFilename = 'positions_' + newTugt._key + '.json'
      let writer = await saveAttachment(newTugt.userKey, newTugt.studyKey, newTugt.taskId, positionsFilename)
      await writer.writeChunk(JSON.stringify(positions))
      await writer.end()
      const stepsFilename = 'steps_' + newTugt._key + '.json'
      writer = await saveAttachment(newTugt.userKey, newTugt.studyKey, newTugt.taskId, stepsFilename)
      await writer.writeChunk(JSON.stringify(steps))
      await writer.end()

      // save the filename
      newTugt.attachments = [positionsFilename, stepsFilename]
      newTugt = await DAO.replaceTugt(newTugt._key, newTugt, trans)

      // also update task status
      taskItem.lastExecuted = newTugt.createdTS
      // update the participant
      await DAO.replaceParticipant(participant._key, participant, trans)

      // all done now
      DAO.endTransaction(trans)

      res.sendStatus(200)
      applogger.info({ userKey: req.user._key, taskId: newTugt.taskId, studyKey: newTugt.studyKey }, 'Participant has sent a new tugt')
      auditLogger.log('TUGTDataCreated', req.user._key, newTugt.studyKey, newTugt.taskId, 'Tugt data created by participant with key ' + participant._key + ' for study with key ' + newTugt.studyKey, 'TUGTData', newTugt._key, newTugt)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new tugt')
      res.sendStatus(500)
    }
  })

  return router
}
