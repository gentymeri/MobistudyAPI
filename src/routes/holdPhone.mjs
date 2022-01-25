'use strict'

/**
 * This provides the API endpoints for the holdPhone of the participant.
 */

import express from 'express'
import passport from 'passport'
import { DAO } from '../DAO/DAO.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'
import { saveAttachment } from '../services/attachments.mjs'

const router = express.Router()

export default async function () {
  // Get all holdPhone data
  // query params: studyKey to filter by study
  router.get('/HoldPhoneData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      if (req.user.role === 'researcher') {
        if (req.user.role === 'researcher') {
          const team = await DAO.getAllTeams(req.user._key, req.query.studyKey)
          if (team.length === 0) return res.sendStatus(403)
          else {
            const HoldPhone = await DAO.getHoldPhoneDataByStudy(req.query.studyKey)
            res.send(HoldPhone)
          }
        } else if (req.user.role === 'participant') {
          const HoldPhone = await DAO.getHoldPhoneByUser(req.user._key)
          res.send(HoldPhone)
        } else {
          // admin
          const HoldPhone = await DAO.getAllHoldPhone()
          res.send(HoldPhone)
        }
      } else if (req.user.role === 'participant') {
        const storeData = await DAO.getHoldPhoneByUser(req.user._key)
        res.send(storeData)
      }
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retriev HoldPhone data')
      res.sendStatus(500)
    }
  })

  router.post('/HoldPhoneData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newHoldPhone = req.body
    if (req.user.role !== 'participant') return res.sendStatus(403)
    newHoldPhone.userKey = req.user._key
    if (!newHoldPhone.createdTS) newHoldPhone.createdTS = new Date()
    let trans
    try {
      const participant = await DAO.getParticipantByUserKey(req.user._key)
      if (!participant) return res.sendStatus(404)
      const study = participant.studies.find((s) => {
        return s.studyKey === newHoldPhone.studyKey
      })
      if (!study) return res.sendStatus(400)
      const taskItem = study.taskItemsConsent.find(ti => ti.taskId === newHoldPhone.taskId)
      if (!taskItem) return res.sendStatus(400)

      trans = await DAO.startTransaction([DAO.HoldPhoneTransaction(), DAO.participantsTransaction()])

      // separate raw data from the object stored on the database
      const positions = newHoldPhone.positions
      delete newHoldPhone.positions
      const steps = newHoldPhone.steps
      delete newHoldPhone.steps

      // store the data on the database
      newHoldPhone = await DAO.createHoldPhone(newHoldPhone, trans)

      // save the attachments
      const positionsFilename = 'positions_' + newHoldPhone._key + '.json'
      let writer = await saveAttachment(newHoldPhone.userKey, newHoldPhone.studyKey, newHoldPhone.taskId, positionsFilename)
      await writer.writeChunk(JSON.stringify(positions))
      await writer.end()
      const stepsFilename = 'steps_' + newHoldPhone._key + '.json'
      writer = await saveAttachment(newHoldPhone.userKey, newHoldPhone.studyKey, newHoldPhone.taskId, stepsFilename)
      await writer.writeChunk(JSON.stringify(steps))
      await writer.end()

      // save the filename
      newHoldPhone.attachments = [positionsFilename, stepsFilename]
      newHoldPhone = await DAO.replaceHoldPhone(newHoldPhone._key, newHoldPhone, trans)

      // also update task status
      taskItem.lastExecuted = newHoldPhone.createdTS
      // update the participant
      await DAO.replaceParticipant(participant._key, participant, trans)

      // all done now
      DAO.endTransaction(trans)

      res.sendStatus(200)
      applogger.info({ userKey: req.user._key, taskId: newHoldPhone.taskId, studyKey: newHoldPhone.studyKey }, 'Participant has sent a new HoldPhone')
      auditLogger.log('HoldPhoneDataCreated', req.user._key, newHoldPhone.studyKey, newHoldPhone.taskId, 'HoldPhone data created by participant with key ' + participant._key + ' for study with key ' + newHoldPhone.studyKey, 'HoldPhoneData', newHoldPhone._key, newHoldPhone)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new HoldPhone')
      res.sendStatus(500)
    }
  })

  return router
}
