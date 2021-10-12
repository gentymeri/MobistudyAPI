'use strict'

/**
 * This provides the API endpoints for the tapping data of the participant.
 */

import express from 'express'
import passport from 'passport'
import { DAO } from '../DAO/DAO.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'
import { saveAttachment } from '../services/attachments.mjs'

const router = express.Router()

export default async function () {
  // Get all tapping data
  // optional query param for researcher: studyKey to filter by study
  router.get('/fingerTapping', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      if (req.user.role === 'researcher') {
        const team = await DAO.getAllTeams(req.user._key, req.query.studyKey)
        if (team.length === 0) return res.sendStatus(403)
        else {
          const tappingData = await DAO.getFingerTappingsByStudy(req.query.studyKey)
          res.send(tappingData)
        }
      } else if (req.user.role === 'participant') {
        const tappingData = await DAO.getFingerTappingsByUser(req.user._key)
        res.send(tappingData)
      } else {
        // admin
        const tappingData = await DAO.getAllFingerTappings()
        res.send(tappingData)
      }
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve tappingData')
      res.sendStatus(500)
    }
  })

  router.post('/fingerTapping', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newtappingData = req.body
    if (req.user.role !== 'participant') return res.sendStatus(403)
    newtappingData.userKey = req.user._key
    if (!newtappingData.createdTS) newtappingData.createdTS = new Date()
    let trans
    try {
      const participant = await DAO.getParticipantByUserKey(req.user._key)
      if (!participant) return res.sendStatus(404)
      const study = participant.studies.find((s) => {
        return s.studyKey === newtappingData.studyKey
      })
      if (!study) return res.sendStatus(400)
      const taskItem = study.taskItemsConsent.find(ti => ti.taskId === newtappingData.taskId)
      if (!taskItem) return res.sendStatus(400)

      trans = await DAO.startTransaction([DAO.fingerTappingTransaction()])

      // separate tappingData from the object stored on the database
      const tappingData = newtappingData.tappingData
      delete newtappingData.tappingData

      // store the database data
      newtappingData = await DAO.createFingerTapping(newtappingData, trans)

      // save the attachment
      const filename = newtappingData._key + '.json'
      const writer = await saveAttachment(newtappingData.userKey, newtappingData.studyKey, newtappingData.taskId, filename)
      await writer.writeChunk(JSON.stringify(tappingData))
      await writer.end()

      // save the filename
      newtappingData.attachments = [filename]
      newtappingData = await DAO.replaceFingerTapping(newtappingData._key, newtappingData, trans)

      // also update task status
      taskItem.lastExecuted = newtappingData.createdTS
      await DAO.replaceParticipant(participant._key, participant)

      DAO.endTransaction(trans)

      res.sendStatus(200)
      applogger.info({ userKey: req.user._key, taskId: newtappingData.taskId, studyKey: newtappingData.studyKey }, 'Participant has sent finger tapping data')
      auditLogger.log('fingerTappingCreated', req.user._key, newtappingData.studyKey, newtappingData.taskId, 'Finger tapping data created by participant with key ' + participant._key + ' for study with key ' + newtappingData.studyKey, 'fingerTapping', newtappingData._key, newtappingData)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new tappingData Data')
      res.sendStatus(500)
      DAO.abortTransation(trans)
    }
  })

  return router
}
