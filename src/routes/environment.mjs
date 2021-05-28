'use strict'

/**
 * This provides the API endpoints for the GPS data of the participant.
 */

import express from 'express'
import passport from 'passport'
import { DAO } from '../DAO/DAO.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'

const router = express.Router()

export default async function () {
  // Get all GPS data
  // query params: studyKey to filter by study
  router.get(
    '/gpsData',
    passport.authenticate('jwt', { session: false }),
    async function (req, res) {
      try {
        if (req.user.role === 'researcher') {
          // extra check about the teams
          if (req.query.teamKey) {
            const team = await DAO.getOneTeam(req.query.teamKey)
            if (!team.researchersKeys.includes(req.user._key)) { return res.sendStatus(403) } else {
              const gpsData = await DAO.getAllGPSData()
              res.send(gpsData)
            }
          }
          if (req.query.studyKey) {
            const team = await DAO.getAllTeams(req.user._key, req.query.studyKey)
            if (team.length === 0) return res.sendStatus(403)
            else {
              const gpsData = await DAO.getGPSDataByStudy(req.query.studyKey)
              res.send(gpsData)
            }
          }
        } else if (req.user.role === 'participant') {
          const gpsData = await DAO.getGPSDataByUser(req.user._key)
          res.send(gpsData)
        }
      } catch (err) {
        applogger.error({ error: err }, 'Cannot retrieve GPSData')
        res.sendStatus(500)
      }
    }
  )

  // Get GPSfor a user
  router.get(
    '/gpsData/:userKey',
    passport.authenticate('jwt', { session: false }),
    async function (req, res) {
      try {
        const gpsData = await DAO.getGPSDataByUser(req.params.userKey)
        res.send(gpsData)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot retrieve GPSData')
        res.sendStatus(500)
      }
    }
  )

  // Get GPS for a study for a user
  router.get(
    '/gpsData/:userKey/:studyKey',
    passport.authenticate('jwt', { session: false }),
    async function (req, res) {
      try {
        const gpsData = await DAO.getGPSDataByUserAndStudy(
          req.params.userKey,
          req.params.studyKey
        )
        res.send(gpsData)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot retrieve GPSData')
        res.sendStatus(500)
      }
    }
  )

  router.post(
    '/gpsData',
    passport.authenticate('jwt', { session: false }),
    async function (req, res) {
      let newGPSData = req.body
      if (req.user.role !== 'participant') return res.sendStatus(403)
      newGPSData.userKey = req.user._key
      if (!newGPSData.createdTS) newGPSData.createdTS = new Date()
      try {
        newGPSData = await DAO.createGPSData(newGPSData)
        // also update task status

        const participant = await DAO.getParticipantByUserKey(req.user._key)
        applogger.info(
          {
            userKey: req.user._key,
            taskId: newGPSData.taskId,
            studyKey: newGPSData.studyKey
          },
          'Finding participant'
        )
        if (!participant) return res.status(404)
        applogger.info(
          {
            userKey: req.user._key,
            taskId: newGPSData.taskId,
            studyKey: newGPSData.studyKey
          },
          'Found participant'
        )
        const study = participant.studies.find((s) => {
          return s.studyKey === newGPSData.studyKey
        })
        if (!study) return res.status(400)
        const taskItem = study.taskItemsConsent.find(
          (ti) => ti.taskId === newGPSData.taskId
        )
        if (!taskItem) return res.status(400)
        taskItem.lastExecuted = newGPSData.createdTS
        // update the participant
        await DAO.replaceParticipant(participant._key, participant)
        res.sendStatus(200)
        applogger.info(
          {
            userKey: req.user._key,
            taskId: newGPSData.taskId,
            studyKey: newGPSData.studyKey
          },
          'Participant has sent health store data'
        )
        auditLogger.log(
          'GPSDataCreated',
          req.user._key,
          newGPSData.studyKey,
          newGPSData.taskId,
          'GPSData data created by participant with key ' +
            participant._key +
            ' for study with key ' +
            newGPSData.studyKey,
          'GPSData',
          newGPSData._key,
          newGPSData
        )
      } catch (err) {
        applogger.error({ error: err }, 'Cannot store new GPSData Data')
        res.sendStatus(500)
      }
    }
  )

  return router
}
