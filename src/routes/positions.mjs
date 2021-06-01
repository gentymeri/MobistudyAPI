'use strict'

/**
 * This provides the API endpoints for the position data of the participant.
 */

import express from 'express'
import passport from 'passport'
import { DAO } from '../DAO/DAO.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'
import { getWeather, getPollution, getPostcode, getAllergenes } from '../services/environment.mjs'

const router = express.Router()

export default async function () {
  router.get(
    '/positions/environment',
    passport.authenticate('jwt', { session: false }),
    async function (req, res) {
      try {
        const lat = req.query.lat
        const long = req.query.long
        if (!lat || !long) return res.sendStatus(400)
        const env = {
          lat, long
        }
        const result = await Promise.all([
          getWeather(lat, long),
          getPollution(lat, long),
          getPostcode(lat, long),
          getAllergenes(lat, long)
        ])
        env.weather = result[0]
        env.pollution = result[1]
        env.postcode = result[2]
        env.allergens = result[3]
        res.send(env)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot retrieve environment')
        res.sendStatus(500)
      }
    }
  )

  // Get all positions data
  // query params: studyKey to filter by study
  router.get(
    '/positions',
    passport.authenticate('jwt', { session: false }),
    async function (req, res) {
      try {
        if (req.user.role === 'researcher') {
          // extra check about the teams
          if (req.query.teamKey) {
            const team = await DAO.getOneTeam(req.query.teamKey)
            if (!team.researchersKeys.includes(req.user._key)) { return res.sendStatus(403) } else {
              const poss = await DAO.getAllPositions()
              res.send(poss)
            }
          }
          if (req.query.studyKey) {
            const team = await DAO.getAllTeams(req.user._key, req.query.studyKey)
            if (team.length === 0) return res.sendStatus(403)
            else {
              const poss = await DAO.getPositionsByStudy(req.query.studyKey)
              res.send(poss)
            }
          }
        } else if (req.user.role === 'participant') {
          const poss = await DAO.getPositionsByUser(req.user._key)
          res.send(poss)
        }
      } catch (err) {
        applogger.error({ error: err }, 'Cannot retrieve positions')
        res.sendStatus(500)
      }
    }
  )

  // Get positions for a user
  router.get(
    '/positions/:userKey',
    passport.authenticate('jwt', { session: false }),
    async function (req, res) {
      try {
        const poss = await DAO.getPositionsByUser(req.params.userKey)
        res.send(poss)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot retrieve positions')
        res.sendStatus(500)
      }
    }
  )

  // Get positions for a study for a user
  router.get(
    '/positions/:userKey/:studyKey',
    passport.authenticate('jwt', { session: false }),
    async function (req, res) {
      try {
        const poss = await DAO.getPositionsByUserAndStudy(
          req.params.userKey,
          req.params.studyKey
        )
        res.send(poss)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot retrieve positions')
        res.sendStatus(500)
      }
    }
  )

  router.post(
    '/positions',
    passport.authenticate('jwt', { session: false }),
    async function (req, res) {
      let newpos = req.body
      if (req.user.role !== 'participant') return res.sendStatus(403)
      newpos.userKey = req.user._key
      if (!newpos.createdTS) newpos.createdTS = new Date()
      try {
        newpos = await DAO.createPosition(newpos)
        // also update task status

        const participant = await DAO.getParticipantByUserKey(req.user._key)
        if (!participant) return res.status(404)
        const study = participant.studies.find((s) => {
          return s.studyKey === newpos.studyKey
        })
        if (!study) return res.status(400)
        const taskItem = study.taskItemsConsent.find(
          (ti) => ti.taskId === newpos.taskId
        )
        if (!taskItem) return res.status(400)
        taskItem.lastExecuted = newpos.createdTS
        // update the participant
        await DAO.replaceParticipant(participant._key, participant)
        res.sendStatus(200)
        applogger.info(
          {
            userKey: req.user._key,
            taskId: newpos.taskId,
            studyKey: newpos.studyKey
          },
          'Participant has sent a position'
        )
        auditLogger.log(
          'PositionCreated',
          req.user._key,
          newpos.studyKey,
          newpos.taskId,
          'Position created by participant with key ' +
            participant._key +
            ' for study with key ' +
            newpos.studyKey,
          'positions',
          newpos._key,
          newpos
        )
      } catch (err) {
        applogger.error({ error: err }, 'Cannot store new position')
        res.sendStatus(500)
      }
    }
  )

  return router
}
