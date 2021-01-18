'use strict'

/**
* Sets-up the loggers.
* Returns two loggers, one for the http raw stuff and one for the application.
*/

import fs from 'fs'

var config

/**
* Retrieves Docker secrets from /run/secrets
*/
function getSwarmSecret (secret) {
  try {
    // Swarm secret are accessible within tmpfs /run/secrets dir
    return fs.readFileSync(util.format('/run/secrets/%s', secret), 'utf8').trim()
  }
  catch (e) {
    return false
  }
}

export default function () {
  if (!config) {
    try {
      const configfile = fs.readFileSync('./config/config.json', 'utf8')
      config = JSON.parse(configfile)
    } catch (err) {
      console.log('No config file was specified, using secrets or defaults')
      config = {}
    }
    if (config.web === undefined) config.web = {}
    if (config.web.port === undefined) config.web.port = (process.env.WEB_PORT || 8080)
    if (config.web.cluster === undefined) config.web.cluster = (process.env.WEB_CLUSTER || true)

    if (config.logs === undefined) config.logs = {}
    if (config.logs.folder === undefined) config.logs.folder = (process.env.LOGS_FOLDER || 'logs')
    if (config.logs.rotationsize === undefined) config.logs.rotationsize = (process.env.LOGS_ROTATIONSIZE || '1M')
    if (config.logs.console === undefined) config.logs.console = (process.env.LOGS_CONSOLE || false)
    if (config.logs.level === undefined) config.logs.level = parseInt(process.env.LOGS_LEVEL || '30')

    if (config.auth === undefined) config.auth = {}
    if (config.secret === undefined) config.secret = (getSwarmSecret('AUTH_SECRET') || process.env.AUTH_SECRET)
    if (config.tokenExpires === undefined) config.tokenExpires = (process.env.AUTH_TOKEN_EXPIRES || '30 days')
    if (config.adminEmail === undefined) config.adminEmail = (getSwarmSecret('AUTH_ADMIN_EMAIL') || process.env.AUTH_ADMIN_EMAIL)
    if (config.adminPassword === undefined) config.adminPassword = (getSwarmSecret('AUTH_ADMIN_PASSWORD') || process.env.AUTH_ADMIN_PASSWORD)

    if (config.db === undefined) config.db = {}
    if (config.host === undefined) config.host = (process.env.DB_HOST || 'localhost')
    if (config.port === undefined) config.port = parseInt(process.env.DB_PORT || '8529')
    if (config.name === undefined) config.name = (getSwarmSecret('DB_NAME') || process.env.DB_NAME)
    if (config.user === undefined) config.user = (getSwarmSecret('DB_USER') || process.env.DB_USER)
    if (config.password === undefined) config.password = (getSwarmSecret('DB_PASSWORD') || process.env.DB_PASSWORD)

    if (config.outlook === undefined) config.outlook = {}
    if (config.outlook.email === undefined) config.outlook.email = process.env.OUTLOOK_EMAIL
    if (config.outlook.password === undefined) config.outlook.password = (getSwarmSecret('OUTLOOK_PASSWORD') || process.env.OUTLOOK_PASSWORD)
  }
  return config
}
