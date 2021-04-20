'use strict'

/**
* This provides the routes for the 
*/

import express from 'express'
import passport from 'passport'
import dataZipper from '../services/dataZipper.mjs'

const router = express.Router()

// Warning: this implementation can block processing of other routes
// a more asynchronous implementation could use worker threads
// (see worker threads [here](https://blog.logrocket.com/node-js-multithreading-what-are-worker-threads-and-why-do-they-matter-48ab102f8b10/) and [here](https://medium.com/@Trott/using-worker-threads-in-node-js-80494136dbb6))
// but requires more endpoints (one for starting compression and one for querying status)
export default function (app) {

    // serve static files
    app.use('/datadownload', express.static(dataZipper.tempFolderPath))

    // more secure version, but needs cookies instead of oauth token
    // app.use('/datadownload', [
    //     passport.authenticate('jwt', { session: false }),
    //     async function (req, res, next) {
    //         if (req.user.role !== 'admin' && req.user.role !== 'researcher') {
    //             res.sendStatus(403)
    //         } else {
    //             // the researcher has to be allowed to see that study
    //             if (req.user.role === 'researcher') {
    //                 try {
    //                     // extract study key from file name:
    //                     let studyKey = req.path.substring(1).split('.zip')[0]
    //                     let teams = await DAO.getAllTeams(req.user._key, studyKey)
    //                     if (teams.length === 0) res.sendStatus(403)
    //                 } catch (e) {
    //                     res.sendStatus(403)
    //                 }
    //             }
    //         }
    //         next();
    //     },
    //     express.static('studyzipfiles')])

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
            let oneweek = 7 * 24 * 60 * 60
            await dataZipper.purgeOldFiles(oneweek)
            let filename = await zipStudyData(req.params.studyKey)
            res.send(filename)
        }
    })

    return router
}
