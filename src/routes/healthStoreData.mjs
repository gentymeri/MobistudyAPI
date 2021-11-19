'use strict'

/**
* This provides the API endpoints for the health data of the participant.
*/

import express from 'express'
import passport from 'passport'
import { DAO } from '../DAO/DAO.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'
import { saveAttachment } from '../services/attachments.mjs'

const router = express.Router()

export default async function () {
  // Get all health store data
  // optional query param for researcher: studyKey to filter by study
  router.get('/healthStoreData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      if (req.user.role === 'researcher') {
        const team = await DAO.getAllTeams(req.user._key, req.query.studyKey)
        if (team.length === 0) return res.sendStatus(403)
        else {
          const storeData = await DAO.getHealthStoreDataByStudy(req.query.studyKey)
          res.send(storeData)
        }
      } else if (req.user.role === 'participant') {
        const storeData = await DAO.getHealthStoreDataByUser(req.user._key)
        res.send(storeData)
      } else {
        // admin
        const tappingData = await DAO.getAllHealthStoreData()
        res.send(tappingData)
      }
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve healthStore data')
      res.sendStatus(500)
    }
  })

  router.post('/healthStoreData', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newHealthStoreData = req.body
    if (req.user.role !== 'participant') return res.sendStatus(403)
    newHealthStoreData.userKey = req.user._key
    if (!newHealthStoreData.createdTS) newHealthStoreData.createdTS = new Date()
    let trans
    try {
      const participant = await DAO.getParticipantByUserKey(req.user._key)
      if (!participant) return res.sendStatus(404)
      const study = participant.studies.find((s) => {
        return s.studyKey === newHealthStoreData.studyKey
      })
      if (!study) return res.sendStatus(400)
      const taskItem = study.taskItemsConsent.find(ti => ti.taskId === newHealthStoreData.taskId)
      if (!taskItem) return res.sendStatus(400)

      trans = await DAO.startTransaction([DAO.healthStoreDataTransaction(), DAO.participantsTransaction()])

      // separate raw data from the object stored on the database
      const hsData = newHealthStoreData.healthData
      delete newHealthStoreData.healthData

      // store the data on the database
      newHealthStoreData = await DAO.createHealthStoreData(newHealthStoreData, trans)
      // save the attachment
      const filename = newHealthStoreData._key + '.json'
      const writer = await saveAttachment(newHealthStoreData.userKey, newHealthStoreData.studyKey, newHealthStoreData.taskId, filename)
      await writer.writeChunk(JSON.stringify(hsData))
      await writer.end()

      // save the filename
      newHealthStoreData.attachments = [filename]
      newHealthStoreData = await DAO.replaceHealthStoreData(newHealthStoreData._key, newHealthStoreData, trans)

      // also update task status
      taskItem.lastExecuted = newHealthStoreData.createdTS
      await DAO.replaceParticipant(participant._key, participant, trans)

      // all done now
      DAO.endTransaction(trans)

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
