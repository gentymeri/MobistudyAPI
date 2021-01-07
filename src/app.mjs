'use strict'

/**
* Sets-up the application.
* Returns an express app.
*/

import express from 'express'
import helmet from 'helmet'
import bodyParser from 'body-parser'
import passport from 'passport'

import { applogger, httplogger } from './services/logger.mjs'
import authConfig from './services/authSetup.mjs'

import indexRouter from './routes/index.mjs'
import studiesRouter from './routes/studies.mjs'
import formsRouter from './routes/forms.mjs'
import usersRouter from './routes/users.mjs'
import participantsRouter from './routes/participants.mjs'
import teamsRouter from './routes/teams.mjs'
import answersRouter from './routes/answers.mjs'
import healthStoreDataRouter from './routes/healthStoreData.mjs'
import auditLogRouter from './routes/auditLog.mjs'
import testerRouter from './routes/tester.mjs'
import vocabularyRouter from './routes/vocabulary.mjs'
import SMWTRouter from './routes/SMWTData.mjs'
import QCSTRouter from './routes/QCSTData.mjs'
import Miband3Router from './routes/miband3.mjs'

export default async function () {
  authConfig()

  var app = express()

  app.use(helmet())
  app.use(httplogger)
  // setup body parser
  // default limit is 100kb, so we need to extend the limit
  // see http://stackoverflow.com/questions/19917401/node-js-express-request-entity-too-large
  app.use(bodyParser.urlencoded({ limit: '20mb', extended: false }))
  app.use(bodyParser.json({ limit: '20mb' }))
  app.use(bodyParser.text({ limit: '20mb' }))


  // this needs to be called by apps, allow CORS for everybody
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
    next()
  })

  app.use(passport.initialize())

  const api_prefix = '/api'

  app.use(api_prefix, await indexRouter())
  app.use(api_prefix, await studiesRouter())
  app.use(api_prefix, await formsRouter())
  app.use(api_prefix, await usersRouter())
  app.use(api_prefix, await participantsRouter())
  app.use(api_prefix, await teamsRouter())
  app.use(api_prefix, await answersRouter())
  app.use(api_prefix, await healthStoreDataRouter())
  app.use(api_prefix, await auditLogRouter())
  app.use(api_prefix, await testerRouter())
  app.use(api_prefix, await vocabularyRouter())
  app.use(api_prefix, await SMWTRouter())
  app.use(api_prefix, await QCSTRouter())
  app.use(api_prefix, await Miband3Router())

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
