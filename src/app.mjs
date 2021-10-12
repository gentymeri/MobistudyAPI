'use strict'

/**
 * Sets-up the application.
 * Returns an express app.
 */

import express from 'express'
import helmet from 'helmet'
import passport from 'passport'

import { applogger, httplogger } from './services/logger.mjs'
import authConfig from './services/authSetup.mjs'

import { initializeDAO } from './DAO/DAO.mjs'

import indexRouter from './routes/index.mjs'
import studiesRouter from './routes/studies.mjs'
import dataDownload from './routes/dataDownload.mjs'
import formsRouter from './routes/forms.mjs'
import usersRouter from './routes/users.mjs'
import participantsRouter from './routes/participants.mjs'
import teamsRouter from './routes/teams.mjs'
import answersRouter from './routes/answers.mjs'
import healthStoreDataRouter from './routes/healthStoreData.mjs'
import auditLogRouter from './routes/auditLog.mjs'
import testerRouter from './routes/tester.mjs'
import vocabularyRouter from './routes/vocabulary.mjs'
import smwtsRouter from './routes/smwts.mjs'
import QCSTRouter from './routes/QCSTData.mjs'
import Miband3Router from './routes/miband3.mjs'
import PO60Router from './routes/po60.mjs'
import PeakFlowRouter from './routes/peakflow.mjs'
import PositionsRouter from './routes/positions.mjs'
import fingerTappingRouter from './routes/fingerTapping.mjs'
import mSafetyRouter from './routes/mSafety.mjs'
import attachmentsRouter from './routes/attachments.mjs'

export default async function () {
  const app = express()

  app.use(helmet())
  app.use(httplogger)
  // setup body parser
  // default limit is 100kb, so we need to extend the limit
  // see http://stackoverflow.com/questions/19917401/node-js-express-request-entity-too-large
  app.use(express.urlencoded({ limit: '20mb', extended: false }))
  app.use(express.json({ limit: '20mb' }))
  app.use(express.text({ limit: '20mb' }))

  // this needs to be called by apps, allow CORS for everybody
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'PUT, PATCH, DELETE, GET, POST')
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    )
    next()
  })

  await initializeDAO()

  await authConfig()

  app.use(passport.initialize())

  const apiPrefix = '/api'

  app.use(apiPrefix, await indexRouter())
  app.use(apiPrefix, await studiesRouter())
  app.use(apiPrefix, dataDownload(app))
  app.use(apiPrefix, await formsRouter())
  app.use(apiPrefix, await usersRouter())
  app.use(apiPrefix, await participantsRouter())
  app.use(apiPrefix, await teamsRouter())
  app.use(apiPrefix, await answersRouter())
  app.use(apiPrefix, await healthStoreDataRouter())
  app.use(apiPrefix, await auditLogRouter())
  app.use(apiPrefix, await testerRouter())
  app.use(apiPrefix, await vocabularyRouter())
  app.use(apiPrefix, await smwtsRouter())
  app.use(apiPrefix, await QCSTRouter())
  app.use(apiPrefix, await Miband3Router())
  app.use(apiPrefix, await PO60Router())
  app.use(apiPrefix, await PeakFlowRouter())
  app.use(apiPrefix, await PositionsRouter())
  app.use(apiPrefix, await fingerTappingRouter())
  app.use(apiPrefix, await attachmentsRouter())

  app.use(apiPrefix, await mSafetyRouter())

  // error handler
  app.use(function (err, req, res, next) {
    applogger.error(err, 'General error')

    // set locals, only providing error in development
    res.locals.message = err.message
    res.locals.error = req.app.get('env') === 'development' ? err : {}

    // render the error page
    res.status(err.status || 500)
    res.send('<p>INTERNAL ERROR</p>')
  })

  applogger.info('Starting server')

  return app
}
