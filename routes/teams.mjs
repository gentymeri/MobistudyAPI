'use strict'

/**
* This provides the API endpoints for the teams.
*/

import express from 'express'
import passport from 'passport'
import getDB from '../DB/DB'
import jwt from 'jsonwebtoken'

import getConfig from '../config'
import { applogger } from '../logger'
import auditLogger from '../auditLogger'

const router = express.Router()

export default async function () {
  var db = await getDB()
  var config = getConfig()

  router.get('/teams', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      let teams
      if (req.user.role === 'admin') {
        teams = await db.getAllTeams()
      } else if (req.user.role === 'researcher') {
        teams = await db.getAllTeams(req.user._key)
      } else return res.sendStatus(403)
      res.send(teams)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve teams')
      res.sendStatus(500)
    }
  })

  router.get('/teams/:team_key', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      let team
      if (req.user.role === 'admin') {
        team = await db.getOneTeam(req.params.team_key)
        res.send(team)
      } else if (req.user.role === 'researcher') {
        team = await db.getOneTeam(req.params.team_key)
        if (team.researchersKeys.includes(req.user._key)) res.send(team)
        else res.sendStatus(403)
      } else res.sendStatus(403)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve team with _key ' + req.params.team_key)
      res.sendStatus(500)
    }
  })

  // create a new team
  router.post('/teams', passport.authenticate('jwt', { session: false }), async function (req, res) {
    if (req.user.role === 'admin') {
      let newteam = req.body
      newteam.createdTS = new Date()
      newteam.researchersKeys = []
      try {
        let existingTeam = await db.findTeam(newteam.name)
        if (existingTeam) return res.sendStatus(409)
        newteam = await db.createTeam(newteam)
        res.send(newteam)
        applogger.info(newteam, 'New team created')
        auditLogger.log('teamCreated', req.user._key, undefined, undefined, 'New team created ' + newteam.name, 'teams', newteam._key, newteam)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot store new study')
        res.sendStatus(500)
      }
    } else res.sendStatus(403)
  })

  router.get('/teams/invitationCode/:teamKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
    if (req.user.role === 'admin') {
      try {
        let teamkey = req.params.teamKey

        let team = await db.getOneTeam(teamkey)
        if (!team) return res.sendStatus(400)

        let weeksecs = 7 * 24 * 60 * 60
        const token = jwt.sign({
          teamKey: teamkey
        }, config.auth.secret, {
          expiresIn: weeksecs
        })
        team.invitationCode = token
        team.invitationExpiry = new Date(new Date().getTime() + (weeksecs * 1000))
        await db.replaceTeam(teamkey, team)
        res.send(token)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot generate invitation code for team ' + req.params.teamKey)
        res.sendStatus(500)
      }
    } else res.sendStatus(403)
  })

  // add a researcher to a team
  router.post('/teams/researcher/add', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let researcherKeyUpdt = req.user._key
    let JToken = req.body.invitationCode
    // Verify the JWT
    try {
      var decoded = jwt.verify(JToken, config.auth.secret)
      if (new Date().getTime() >= (decoded.exp * 1000)) {
        applogger.error('Adding researcher to team, token has expired')
        res.sendStatus(400)
      } else {
        let decodedTeamKey = decoded.teamKey
        let selTeam = await db.getOneTeam(decodedTeamKey)
        if (selTeam) {
          if (selTeam.researchersKeys.includes(researcherKeyUpdt)) {
            applogger.error('Adding researcher to team, researcher already added')
            res.sendStatus(409)
          } else {
            selTeam.researchersKeys.push(researcherKeyUpdt)
            await db.replaceTeam(decodedTeamKey, selTeam)
            res.json({ teamName: selTeam.name })
            applogger.info(selTeam, 'Reseacher added to a team')
            auditLogger.log('researcherAddedToTeam', req.user._key, undefined, undefined, 'Researcher with key ' + researcherKeyUpdt + ' added to team ' + selTeam.name, 'teams', selTeam._key, selTeam)
          }
        } else {
          applogger.error('Adding researcher to team, team with key ' + decodedTeamKey + ' does not exist')
          res.sendStatus(400)
        }
      }
    } catch (err) {
      // respond to request with error
      applogger.error({ error: err }, 'Cannot add researcher to team')
      res.sendStatus(500)
    }
  })

  // Remove Researcher from Team
  router.post('/teams/researcher/remove', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let teamKey = req.body.userRemoved.teamKey
    let userKey = req.body.userRemoved.userKey
    if (req.user.role === 'admin') {
      try {
        let selTeam = await db.getOneTeam(teamKey)
        let index = selTeam.researchersKeys.indexOf(userKey)
        if (index !== null) {
          selTeam.researchersKeys.splice(index, 1)
        }
        await db.replaceTeam(teamKey, selTeam)
        res.sendStatus(200)
        applogger.info(selTeam, 'Reseacher removed from team')
        auditLogger.log('researcherRemovedFromTeam', req.user._key, undefined, undefined, 'Researcher with key ' + userKey + ' removed from team ' + selTeam.name, 'teams', selTeam._key, selTeam)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot remove user from study')
        res.sendStatus(400)
      }
    } else res.sendStatus(403)
  })

  // Remove Specified Team
  router.delete('/teams/:team_key', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      // Only admin can remove a team
      if (req.user.role === 'admin') {
        let teamkey = req.params.team_key
        // look for studies of that team
        let teamStudies = await db.getAllTeamStudies(teamkey)
        let participantsByStudy = []
        // Get list of participants per study. Then delete each study.
        for (let i = 0; i < teamStudies.length; i++) {
          participantsByStudy = await db.getParticipantsByStudy(teamStudies[i]._key, null)
          await db.deleteStudy(teamStudies[i]._key)
          for (let j = 0; j < participantsByStudy.length; j++) {
            // Per participant, remove the study
            let partKey = participantsByStudy[j]._key
            let participant = await db.getOneParticipant(partKey)
            let studyArray = participant.studies
            studyArray = studyArray.filter(study => study.studyKey !== teamStudies[i]._key)
            participant.studies = studyArray
            await db.replaceParticipant(partKey, participant)
            // TODO: remove also data of the studies the team is involved in
          }
        }
        await db.removeTeam(teamkey)
        res.sendStatus(200)
        applogger.info({ teamKey: teamkey }, 'Team deleted')
        auditLogger.log('teamDeleted', req.user._key, undefined, undefined, 'Team with key ' + teamkey + ' deleted', 'teams', teamkey, undefined)
      } else res.sendStatus(403)
    } catch (err) {
      // respond to request with error
      applogger.error({ error: err }, 'Cannot delete team ')
      res.sendStatus(500)
    }
  })

  return router
}
