'use strict'

/**
* This provides the API endpoints for the study descriptions.
*/

import express from 'express'
import passport from 'passport'
import { DAO } from '../DAO/DAO.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'

const router = express.Router()

export default async function () {
  // NEW GET STUDIES FUNCTION FOR TableStudies.vue
  router.get('/getStudies', passport.authenticate('jwt', { session: false }), async function (req, res) {
    if (req.user.role !== 'admin') {
      console.log(`not an admin`)
      res.sendStatus(403)
    } else {
      try {
        let result = await DAO.getStudies(false,
          req.query.after,
          req.query.before,
          req.query.studyTitle,
          req.query.sortDirection,
          req.query.offset,
          req.query.rowsPerPage
        )
        console.log('routes/studies.mjs RESULT:', result)
        res.send(result)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot retrieve studies')
        res.sendStatus(500)
      }
    }
  })

  // NEW GET STUDIES COUNT FUNCTION
  router.get('/getStudies/count', passport.authenticate('jwt', { session: false }), async function (req, res) {
    if (req.user.role !== 'admin') {
      console.log(`not an admin`)
      res.sendStatus(403)
    } else {
      try {
        let result = await DAO.getStudies(true,
          req.query.after,
          req.query.before,
          req.query.studyTitle,
          req.query.sortDirection,
          req.query.offset,
          req.query.rowsPerPage
        )
        res.send(result)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot retrieve studies count')
        res.sendStatus(500)
      }
    }
  })

  // query parameters:
  // teamKey (optional)
  router.get('/studies', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      let studies = []
      if (req.user.role === 'researcher') {
        if (req.query.teamKey) {
          let team = await DAO.getOneTeam(req.query.teamKey)
          if (!team.researchersKeys.includes(req.user._key)) return res.sendStatus(403)
          studies = await DAO.getAllTeamStudies(req.query.teamKey)
        } else {
          // limit the studies to the teams the user belongs to
          let teams = await DAO.getAllTeams(req.user._key)
          for (let i = 0; i < teams.lenght; i++) {
            let studies = await DAO.getAllTeamStudies(teams[i]._key)
            studies.push(studies)
          }
        }
      } else if (req.user.role === 'admin') {
        if (req.query.teamKey) {
          studies = await DAO.getAllTeamStudies(req.query.teamKey)
        } else {
          studies = await DAO.getAllStudies()
        }
      } else if (req.user.role === 'participant') {
        let part = await DAO.getParticipantByUserKey(req.user._key)
        studies = await DAO.getAllParticipantStudies(part._key)
      }

      res.send(studies)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve studies')
      res.sendStatus(500)
    }
  })

  // get one speficic study by its key
  router.get('/studies/:study_key', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      // TODO: do some access control
      let study = await DAO.getOneStudy(req.params.study_key)
      if (!study) res.sendStatus(404)
      else res.json(study)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve study with _key ' + req.params.study_key)
      res.sendStatus(500)
    }
  })

  // add a new study
  router.post('/studies', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newstudy = req.body
    newstudy.createdTS = new Date()
    try {
      // TODO: do some access control, check the user is a researcher and that he belongs to the team
      newstudy = await DAO.createStudy(newstudy)
      res.send(newstudy)

      applogger.info(newstudy, 'New study description added')
      auditLogger.log('studyDescriptionAdded', req.user._key, newstudy._key, undefined, 'New study description added', 'studies', newstudy._key, newstudy)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new study')
      res.sendStatus(500)
    }
  })

  // update a study
  router.put('/studies/:study_key', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newstudy = req.body
    newstudy.updatedTS = new Date()
    try {
      // TODO: do some access control
      newstudy = await DAO.replaceStudy(req.params.study_key, newstudy)
      res.send(newstudy)
      applogger.info(newstudy, 'Study replaced')
      auditLogger.log('studyDescriptionReplaced', req.user._key, newstudy._key, undefined, 'Study description replaced', 'studies', newstudy._key, newstudy)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot replace study with _key ' + req.params.study_key)
      res.sendStatus(500)
    }
  })

  // patch a study
  router.patch('/studies/:study_key', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newstudy = req.body
    newstudy.updatedTS = new Date()
    try {
      // TODO: do some access control
      newstudy = await DAO.updateStudy(req.params.study_key, newstudy)
      res.send(newstudy)
      applogger.info(newstudy, 'Study updated')
      auditLogger.log('studyDescriptionUpdated', req.user._key, newstudy._key, undefined, 'Study description updated', 'studies', newstudy._key, newstudy)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot update study with _key ' + req.params.study_key)
      res.sendStatus(500)
    }
  })

  // delete a study
  router.delete('/studies/:study_key', passport.authenticate('jwt', { session: false }), async function (req, res) {
    // If the user is a researcher, ensure that researcher has the same teamKey as the study
    let permissionToDelete = false
    let studykey = req.params.study_key
    if (!studykey) return res.sendStatus(400)
    if (req.user.role === 'researcher') {
      try {
        // Get Team Key of Study
        let study = await DAO.getOneStudy(studykey)
        let teamKeyOfStudy = study.teamKey
        // Get Team Key of User
        let userKey = req.user._key
        let team = await DAO.getAllTeams(userKey, studykey)
        // Validate they are the same
        if (teamKeyOfStudy === team[0]._key) permissionToDelete = true
      } catch (error) {
        applogger.error({ error: error }, 'Cannot confirm researcher has same teamKey as study ' + studykey)
        res.sendStatus(500)
      }
    }
    if (req.user.role === 'admin' || (req.user.role === 'researcher' && permissionToDelete === true)) {
      try {
        // Search participants for study
        let parts = await DAO.getParticipantsByStudy(studykey)
        if (parts) {
          for (let i = 0; i < parts.length; i++) {
            let partKey = parts[i]
            // For Each participant, delete the study key from accepted studies
            let participant = await DAO.getOneParticipant(partKey)
            let studyArray = participant.studies
            studyArray = studyArray.filter(study => study.studyKey !== studykey)
            participant.studies = studyArray
            await DAO.replaceParticipant(partKey, participant)
          }
        }
        // Data needs to be deleted before the study TODO: Should do this for the other type of data as well
        await DAO.deleteAnswersByStudy(studyKey)
        await DAO.deleteHealthStoreByStudy(studykey)
        await DAO.deleteQCSTDataByStudy(studyKey)
        await DAO.deleteSMWTDataByStudy(studyKey)
        await DAO.deleteMiband3DataByStudy(studyKey)
        await DAO.deletePO60DataByStudy(studyKey)

        // Deleting the study
        await DAO.deleteStudy(studykey)

        res.sendStatus(200)
        applogger.info({ studyKey: studykey }, 'Study deleted')
        auditLogger.log('studyDescriptionDeleted', req.user._key, studykey, undefined, 'Study description with key ' + studykey + ' deleted', 'studies', studykey, undefined)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot delete study with _key ' + req.params.study_key)
        res.sendStatus(500)
      }
    } else res.sendStatus(403)
  })

  // only called by participants, does the inclusion criteria matching too
  router.get('/newStudies', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      if (req.user.role !== 'participant') return res.sendStatus(403)
      let studies = await DAO.getMatchedNewStudies(req.user._key)
      res.send(studies)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve studies')
      res.sendStatus(500)
    }
  })

  router.get('/newInvitationCode', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      if (req.user.role !== 'researcher') return res.sendStatus(403)
      let studyCode = await DAO.getNewInvitationCode()
      applogger.info({ studyCode: studyCode }, 'Study code sending back from server')
      if (!studyCode) throw new Error('Cannot retrieve study code', studyCode)
      res.json(studyCode)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve study code')
      res.sendStatus(500)
    }
  })

  router.get('/invitationalStudy/:invitationalCode', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      let invitationalCode = req.params.invitationalCode
      let study = await DAO.getInvitationalStudy(invitationalCode)
      applogger.info({ study: study }, 'Study:')
      if (!study) throw new Error('Cannot find study based on code.')
      res.send(study)
    } catch (err) {
      applogger.error({ error: err }, err.message)
      res.sendStatus(404) // TODO: Why can i not send a custom error message if no study exists?
    }
  })

  return router
}
