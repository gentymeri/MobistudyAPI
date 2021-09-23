'use strict'

/**
* Sets-up configuration.
*/

import fs from 'fs'
import util from 'util'

let config

/**
* Retrieves Docker secrets from /run/secrets
*/
function getSwarmSecret (secret) {
  try {
    // Swarm secret are accessible within tmpfs /run/secrets dir
    return fs.readFileSync(util.format('/run/secrets/%s', secret), 'utf8').trim()
  } catch (e) {
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
    if (config.web.cluster === undefined) config.web.cluster = (process.env.WEB_CLUSTER === 'true' || true)

    if (config.logs === undefined) config.logs = {}
    if (config.logs.folder === undefined) config.logs.folder = (process.env.LOGS_FOLDER || 'logs')
    if (config.logs.rotationsize === undefined) config.logs.rotationsize = (process.env.LOGS_ROTATIONSIZE || '1M')
    if (config.logs.console === undefined) config.logs.console = !!(process.env.LOGS_CONSOLE || false)
    if (config.logs.level === undefined) config.logs.level = parseInt(process.env.LOGS_LEVEL || '30')

    if (config.auth === undefined) config.auth = {}
    if (config.auth.secret === undefined) config.auth.secret = (getSwarmSecret('AUTH_SECRET') || process.env.AUTH_SECRET)
    if (config.auth.tokenExpires === undefined) config.auth.tokenExpires = (process.env.AUTH_TOKEN_EXPIRES || '30 days')
    if (config.auth.adminEmail === undefined) config.auth.adminEmail = (getSwarmSecret('AUTH_ADMIN_EMAIL') || process.env.AUTH_ADMIN_EMAIL)
    if (config.auth.adminPassword === undefined) config.auth.adminPassword = (getSwarmSecret('AUTH_ADMIN_PASSWORD') || process.env.AUTH_ADMIN_PASSWORD)

    if (config.db === undefined) config.db = {}
    if (config.db.host === undefined) config.db.host = (process.env.DB_HOST || 'localhost')
    if (config.db.port === undefined) config.db.port = parseInt(process.env.DB_PORT || '8529')
    if (config.db.name === undefined) config.db.name = (getSwarmSecret('DB_NAME') || process.env.DB_NAME)
    if (config.db.user === undefined) config.db.user = (getSwarmSecret('DB_USER') || process.env.DB_USER)
    if (config.db.password === undefined) config.db.password = (getSwarmSecret('DB_PASSWORD') || process.env.DB_PASSWORD)

    if (config.outlook === undefined) config.outlook = {}
    if (config.outlook.email === undefined) config.outlook.email = process.env.OUTLOOK_EMAIL
    if (config.outlook.user === undefined) config.outlook.user = (getSwarmSecret('OUTLOOK_USER') || process.env.OUTLOOK_USER)
    if (config.outlook.password === undefined) config.outlook.password = (getSwarmSecret('OUTLOOK_PASSWORD') || process.env.OUTLOOK_PASSWORD)

    if (config.environmentAPIs === undefined) config.environmentAPIs = {}
    if (config.environmentAPIs.OpenWeatherMap === undefined) config.environmentAPIs.OpenWeatherMap = (getSwarmSecret('OWP_API_KEY') || process.env.OWP_API_KEY)
    if (config.environmentAPIs.Ambee === undefined) config.environmentAPIs.Ambee = (getSwarmSecret('AMBEE_API_KEY') || process.env.AMBEE_API_KEY)

    if (config.mSafety.webhookAuthKey === undefined) config.mSafety.webhookAuthKey = (getSwarmSecret('MSAFETY_WEBHOOKAUTHKEY') || process.env.MSAFETY_WEBHOOKAUTHKEY)
  }
  return config
}
