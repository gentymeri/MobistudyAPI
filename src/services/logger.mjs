'use strict'

/**
* Sets-up the loggers.
* Returns two loggers, one for the http raw stuff and one for the application.
*/

import rfs from 'rotating-file-stream'
import expresspino from 'express-pino-logger'
import pino from 'pino'
import getConfig from './config.mjs'

const config = getConfig()

const httplogstream = rfs('../logs/http.log', {
  path: config.logs.folder,
  size: config.logs.rotationsize,
  compress: true
})

const applogstream = rfs('../logs/app.log', {
  path: config.logs.folder,
  size: config.logs.rotationsize,
  compress: true
})

httplogstream.on('error', console.error)
httplogstream.on('warning', console.error)

applogstream.on('error', console.error)
applogstream.on('warning', console.error)

const httppino = expresspino(httplogstream)
const applogger = pino(applogstream)

httppino.level = config.logs.level
applogger.level = config.logs.level

let applogger_

if (config.logs.console) {
  applogger_ = {
    trace (object, message) {
      if (message) {
        console.debug(message, object)
        applogger.trace(object, message)
      } else {
        console.debug(object)
        applogger.trace(object)
      }
    },
    debug (object, message) {
      if (message) {
        console.debug(message, object)
        applogger.debug(object, message)
      } else {
        console.debug(object)
        applogger.debug(object)
      }
    },
    info (object, message) {
      if (message) {
        console.info(message, object)
        applogger.info(object, message)
      } else {
        console.info(object)
        applogger.info(object)
      }
    },
    warn (object, message) {
      if (message) {
        console.warn(message, object)
        applogger.warn(object, message)
      } else {
        console.warn(object)
        applogger.warn(object)
      }
    },
    error (object, message) {
      if (message) {
        console.error(message, object)
        applogger.error(object, message)
      } else {
        console.error(object)
        applogger.error(object)
      }
    },
    fatal (object, message) {
      if (message) {
        console.error(message, object)
        applogger.fatal(object, message)
      } else {
        console.error(object)
        applogger.fatal(object)
      }
    }
  }
} else {
  applogger_ = applogger
}

export { httppino as httplogger }
export { applogger_ as applogger }
