'use strict'

/**
 * This provides the API endpoints for the tapping data of the participant.
 */

import express from 'express'
import passport from 'passport'
import { DAO } from '../DAO/DAO.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'

const router = express.Router()

export default async function () {

    // Get all tapping data
    // query params: studyKey to filter by study
    router.get('/tappingData', passport.authenticate('jwt', { session: false }), async function (req, res) {
        try {
            if (req.user.role === 'researcher') {
                // extra check about the teams
                if (req.query.teamKey) {
                    let team = await DAO.getOneTeam(req.query.teamKey)
                    if (!team.researchersKeys.includes(req.user._key)) return res.sendStatus(403)
                    else {
                        let tappingData = await DAO.getAlltappingData()
                        res.send(tappingData)
                    }
                }
                if (req.query.studyKey) {
                    let team = await DAO.getAllTeams(req.user._key, req.query.studyKey)
                    if (team.length === 0) return res.sendStatus(403)
                    else {
                        let tappingData = await DAO.gettappingDataByStudy(req.query.studyKey)
                        res.send(tappingData)
                    }
                }
            } else if (req.user.role === 'participant') {
                let tappingData = await DAO.gettappingDataByUser(req.user._key)
                res.send(tappingData)
            }
        } catch (err) {
            applogger.error({ error: err }, 'Cannot retrieve tappingData')
            res.sendStatus(500)
        }
    })

    // Get tappingfor a user
    router.get('/tappingData/:userKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
        try {
            let tappingData = await DAO.gettappingDataByUser(req.params.userKey)
            res.send(tappingData)
        } catch (err) {
            applogger.error({ error: err }, 'Cannot retrieve tappingData')
            res.sendStatus(500)
        }
    })

    // Get tapping for a study for a user
    router.get('/tappingData/:userKey/:studyKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
        try {
            let tappingData = await DAO.gettappingDataByUserAndStudy(req.params.userKey, req.params.studyKey)
            res.send(tappingData)
        } catch (err) {
            applogger.error({ error: err }, 'Cannot retrieve tappingData')
            res.sendStatus(500)
        }
    })

    router.post('/tappingData', passport.authenticate('jwt', { session: false }), async function (req, res) {
        let newtappingData = req.body
        if (req.user.role !== 'participant') return res.sendStatus(403)
        newtappingData.userKey = req.user._key
        if (!newtappingData.createdTS) newtappingData.createdTS = new Date()
        try {
            newtappingData = await DAO.createtappingData(newtappingData)
            // also update task status

            let participant = await DAO.getParticipantByUserKey(req.user._key)
            applogger.info({ userKey: req.user._key, taskId: newtappingData.taskId, studyKey: newtappingData.studyKey }, 'Finding participant')
            if (!participant) return res.status(404)
            applogger.info({ userKey: req.user._key, taskId: newtappingData.taskId, studyKey: newtappingData.studyKey }, 'Found participant')
            let study = participant.studies.find((s) => {
                return s.studyKey === newtappingData.studyKey
            })
            if (!study) return res.status(400)
            let taskItem = study.taskItemsConsent.find(ti => ti.taskId === newtappingData.taskId)
            if (!taskItem) return res.status(400)
            taskItem.lastExecuted = newtappingData.createdTS
            // update the participant
            await DAO.replaceParticipant(participant._key, participant)
            res.sendStatus(200)
            applogger.info({ userKey: req.user._key, taskId: newtappingData.taskId, studyKey: newtappingData.studyKey }, 'Participant has sent health store data')
            auditLogger.log('tappingDataCreated', req.user._key, newtappingData.studyKey, newtappingData.taskId, 'tappingData data created by participant with key ' + participant._key + ' for study with key ' + newtappingData.studyKey, 'tappingData', newtappingData._key, newtappingData)
        } catch (err) {
            applogger.error({ error: err }, 'Cannot store new tappingData Data')
            res.sendStatus(500)
        }
    })

    return router
}