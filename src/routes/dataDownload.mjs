'use strict'

/**
* This provides the API endpoints for the Aidit Log profiles.
*/

import { promises as fs } from 'fs'
import express from 'express'
import passport from 'passport'
import { dataZipper } from '../services/dataZipper.mjs'

const router = express.Router()

export default async function (app) {

    // serve static files
    app.use(api_prefix + '/studydata', [
        passport.authenticate('jwt', { session: false }),
        function (req, res, next) {
            if (req.user.role !== 'admin' && req.user.role !== 'researcher') {
                res.sendStatus(403)
            } else {
                // the researcher has to be allowed to see that study
                if (req.user.role === 'researcher') {
                    try {
                        // extract study key from file name:
                        let studyKey = req.path.substring(1).split('.zip')[0]
                        let teams = await DAO.getAllTeams(req.user._key, studyKey)
                        if (teams.length === 0) res.sendStatus(403)
                    } catch (e) {
                        res.sendStatus(403)
                    }
                }
            }
            next();
        },
        express.static(path.join(__dirname, 'studyzipfiles'))])

    router.post('/studydatacreate/:studyKey', passport.authenticate('jwt', { session: false }), async function (req, res) {
        if (!req.params.studyKey) {
            res.sendStatus(400)
        } else if (req.user.role !== 'admin' && req.user.role !== 'researcher') {
            res.sendStatus(403)
        } else {
            // Researcher: a study must be specified and the researcher has to be allowed to see that study
            if (req.user.role === 'researcher') {
                let teams = await DAO.getAllTeams(req.user._key, req.query.studyKey)
                if (teams.length === 0) return res.sendStatus(403)
            }
            // always purge
            await dataZipper.purgeOldFiles()
            // TODO: check that the study exists!
            await zipStudyData(req.params.studyKey)
            res.sendStatus(200)
        }
    })

    return router
}
