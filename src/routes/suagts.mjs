'use strict'

/**
 * This provides the API endpoints for the SUAGT of the participant.
 */

import express from 'express'
import passport from 'passport'
import { DAO } from '../DAO/DAO.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'
import { saveAttachment } from '../services/attachments.mjs'

const router = express.Router()

export default async function () {
  // Get all SUAGT data
  // query params: studyKey to filter by study
  router.get('/SUAGTData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      if (req.user.role === 'researcher') {
        if (req.user.role === 'researcher') {
          const team = await DAO.getAllTeams(req.user._key, req.query.studyKey)
          if (team.length === 0) return res.sendStatus(403)
          else {
            const supgts = await DAO.getSuagtsDataByStudy(req.query.studyKey)
            res.send(supgts)
          }
        } else if (req.user.role === 'participant') {
          const suagts = await DAO.getSuagtsByUser(req.user._key)
          res.send(suagts)
        } else {
          // admin
          const suagts = await DAO.getAllSuagts()
          res.send(suagts)
        }
      } else if (req.user.role === 'participant') {
        const storeData = await DAO.getSuagtsByUser(req.user._key)
        res.send(storeData)
      }
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retriev suagt data')
      res.sendStatus(500)
    }
  })

  router.post('/SUAGTData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newSuagt = req.body
    if (req.user.role !== 'participant') return res.sendStatus(403)
    newSuagt.userKey = req.user._key
    if (!newSuagt.createdTS) newSuagt.createdTS = new Date()
    let trans
    try {
      const participant = await DAO.getParticipantByUserKey(req.user._key)
      if (!participant) return res.sendStatus(404)
      const study = participant.studies.find((s) => {
        return s.studyKey === newSuagt.studyKey
      })
      if (!study) return res.sendStatus(400)
      const taskItem = study.taskItemsConsent.find(ti => ti.taskId === newSuagt.taskId)
      if (!taskItem) return res.sendStatus(400)

      trans = await DAO.startTransaction([DAO.suagtTransaction(), DAO.participantsTransaction()])

      // separate raw data from the object stored on the database
      const positions = newSuagt.positions
      delete newSuagt.positions
      const steps = newSuagt.steps
      delete newSuagt.steps

      // store the data on the database
      newSuagt = await DAO.createSuagt(newSuagt, trans)

      // save the attachments
      const positionsFilename = 'positions_' + newSuagt._key + '.json'
      let writer = await saveAttachment(newSuagt.userKey, newSuagt.studyKey, newSuagt.taskId, positionsFilename)
      await writer.writeChunk(JSON.stringify(positions))
      await writer.end()
      const stepsFilename = 'steps_' + newSuagt._key + '.json'
      writer = await saveAttachment(newSuagt.userKey, newSuagt.studyKey, newSuagt.taskId, stepsFilename)
      await writer.writeChunk(JSON.stringify(steps))
      await writer.end()

      // save the filename
      newSuagt.attachments = [positionsFilename, stepsFilename]
      newSuagt = await DAO.replaceSuagt(newSuagt._key, newSuagt, trans)

      // also update task status
      taskItem.lastExecuted = newSuagt.createdTS
      // update the participant
      await DAO.replaceParticipant(participant._key, participant, trans)

      // all done now
      DAO.endTransaction(trans)

      res.sendStatus(200)
      applogger.info({ userKey: req.user._key, taskId: newSuagt.taskId, studyKey: newSuagt.studyKey }, 'Participant has sent a new suagt')
      auditLogger.log('SUAGTDataCreated', req.user._key, newSuagt.studyKey, newSuagt.taskId, 'Suagt data created by participant with key ' + participant._key + ' for study with key ' + newSuagt.studyKey, 'SUAGTData', newSuagt._key, newSuagt)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new suagt')
      res.sendStatus(500)
    }
  })

  return router
}
