'use strict'

/**
* This module abstracts the whole DB with functions (a DAO).
*/

import Database from 'arangojs'
import getStudiesDB from './studiesDB.mjs'
import getFormsDB from './formsDB.mjs'
import getUsersDB from './usersDB.mjs'
import getAnswersDB from './answersDB.mjs'
import getTeamsDB from './teamsDB.mjs'
import getParticipantsDB from './participantsDB.mjs'
import getHealthStoreDataDB from './healthStoreDataDB.mjs'
import getSMWTDataDB from './SMWTDataDB.mjs'
import getQCSTDataDB from './QCSTDataDB.mjs'
import getMiband3DataDB from './miband3DataDB.mjs'
import getPO60DataDB from './po60DataDB.mjs'
import getAuditLogDB from './auditLogDB.mjs'

import getConfig from '../services/config.mjs'

export default async function () {
  var config = getConfig()

  try {
    const db = new Database({ url: 'http://' + config.db.host + ':' + config.db.port })

    db.useDatabase(config.db.name)
    db.useBasicAuth(config.db.user, config.db.password)
    var dao = {}

    let studies = await getStudiesDB(db)
    dao = Object.assign(studies, dao)
    let forms = await getFormsDB(db)
    dao = Object.assign(forms, dao)
    let users = await getUsersDB(db)
    dao = Object.assign(users, dao)
    let answers = await getAnswersDB(db)
    dao = Object.assign(answers, dao)
    let teams = await getTeamsDB(db)
    dao = Object.assign(teams, dao)
    let participants = await getParticipantsDB(db)
    dao = Object.assign(participants, dao)
    let healthStoreData = await getHealthStoreDataDB(db)
    dao = Object.assign(healthStoreData, dao)
    let auditLog = await getAuditLogDB(db)
    dao = Object.assign(auditLog, dao)
    let SMWTData = await getSMWTDataDB(db)
    dao = Object.assign(SMWTData, dao)
    let QCSTData = await getQCSTDataDB(db)
    dao = Object.assign(QCSTData, dao)
    let miband3Data = await getMiband3DataDB(db)
    dao = Object.assign(miband3Data, dao)
    let po60Data = await getPO60DataDB(db)
    dao = Object.assign(po60Data, dao)

    // add new collections here
    return dao
  } catch (err) {
    console.error('----> CANNOT CONNECT TO DATABASE !!!!')
    throw err
  }
}
