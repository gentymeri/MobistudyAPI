'use strict'
/**
* This provides the API endpoints for sending files as attachments.
*/

import express from 'express'
import passport from 'passport'
import { open as fsOpen, stat as fsStat, mkdir as fsMkdir } from 'fs/promises'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'
import { DAO } from '../DAO/DAO.mjs'

const router = express.Router()
const UPLOADSDIR = 'tasksuploads'

export default async function () {
  // webhook for mSafety data
  router.post('/attachments/:studyKey/:taskId', passport.authenticate('jwt', { session: false }), async function (req, res) {
    if (req.user.role !== 'participant') return res.sendStatus(403)
    const studyKey = req.params.studyKey
    const taskId = parseInt(req.params.taskId)
    const userKey = req.user._key
    // check that the user participates into the study
    const participant = await DAO.getParticipantByUserKey(userKey)
    if (!participant) return res.sendStatus(404)
    const study = participant.studies.find((s) => {
      return s.studyKey === studyKey
    })
    if (!study) return res.sendStatus(400)
    // check that the task id is OK
    const taskItem = study.taskItemsConsent.find(ti => ti.taskId === taskId)
    if (!taskItem) return res.sendStatus(400)

    // create the study folder
    const studyDir = UPLOADSDIR + '/' + studyKey
    try {
      await fsStat(studyDir)
    } catch (err) {
      await fsMkdir(studyDir, { recursive: true })
    }

    // create the task folder
    const taskDir = studyDir + '/' + taskId
    try {
      await fsStat(taskDir)
    } catch (err) {
      await fsMkdir(taskDir, { recursive: true })
    }

    // make up a file name
    const ts = new Date().getTime()
    const filename = 'attach_' + userKey + '_' + ts + '.json' // we assume it's always a json here

    // create the file
    let filehandle
    try {
      const filePath = taskDir + '/' + filename
      filehandle = await fsOpen(filePath, 'w')
      if (req.body && Object.keys(req.body).length !== 0) {
        // if the body has already been parsed, save it
        await filehandle.writeFile(req.body)
      } else {
        // else dump it raw
        req.on('data', async (chunk) => {
          await filehandle.writeFile(chunk)
        })
        req.on('end', async () => {
          applogger.debug('Attachment file saved for user ' + userKey + ' study ' + studyKey + ' task ' + taskId + ' at ' + filePath)
          res.sendStatus(200)
          if (filehandle) await filehandle.close()
        })
      }
    } catch (err) {
      console.error(err)
      applogger.error(err, 'Cannot save attachment')
      res.sendStatus(500)
      if (filehandle) await filehandle.close()
    }
  })

  return router
}
