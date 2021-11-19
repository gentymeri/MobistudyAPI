'use strict'

/**
 * This module abstracts the whole DB with functions (a DAO).
 */

import Database from 'arangojs'
import getStudiesDAO from './studiesDAO.mjs'
import getFormsDAO from './formsDAO.mjs'
import getUsersDAO from './usersDAO.mjs'
import getAuditLogDAO from './auditLogDAO.mjs'
import getAnswersDAO from './answersDAO.mjs'
import getTeamsDAO from './teamsDAO.mjs'
import getParticipantsDAO from './participantsDAO.mjs'
import getHealthStoreDataDAO from './healthStoreDataDAO.mjs'
import getSmwtsDAO from './smwtsDAO.mjs'
import getQCSTDataDAO from './QCSTDataDAO.mjs'
import getMiband3DataDAO from './miband3DataDAO.mjs'
import getPO60DataDAO from './po60DataDAO.mjs'
import getPeakFlowDataDAO from './peakflowDataDAO.mjs'
import getPositionsDAO from './positionsDAO.mjs'
import getFingerTappingDAO from './fingerTappingDAO.mjs'

import getConfig from '../services/config.mjs'

export let DAO = {}

export async function initializeDAO () {
  const config = getConfig()

  if (
    !config.db.host ||
    !config.db.port ||
    !config.db.user ||
    !config.db.password
  ) {
    console.error('Configuration is missing some critical parameters', config)
    throw new Error('Configuration is missing some critical parameters')
  }
  const db = new Database({
    url: 'http://' + config.db.host + ':' + config.db.port
  })

  db.useDatabase(config.db.name)
  db.useBasicAuth(config.db.user, config.db.password)

  DAO.startTransaction = async (names) => {
    return db.beginTransaction({
      write: names
    })
  }

  DAO.endTransaction = async (transaction) => {
    return transaction.commit()
  }

  DAO.abortTransation = async (transaction) => {
    if (transaction) return transaction.abort()
  }

  const studies = await getStudiesDAO(db)
  DAO = Object.assign(studies, DAO)
  const forms = await getFormsDAO(db)
  DAO = Object.assign(forms, DAO)
  const users = await getUsersDAO(db)
  DAO = Object.assign(users, DAO)
  const answers = await getAnswersDAO(db)
  DAO = Object.assign(answers, DAO)
  const teams = await getTeamsDAO(db)
  DAO = Object.assign(teams, DAO)
  const participants = await getParticipantsDAO(db)
  DAO = Object.assign(participants, DAO)
  const healthStoreData = await getHealthStoreDataDAO(db)
  DAO = Object.assign(healthStoreData, DAO)
  const auditLog = await getAuditLogDAO(db)
  DAO = Object.assign(auditLog, DAO)
  const SMWTData = await getSmwtsDAO(db)
  DAO = Object.assign(SMWTData, DAO)
  const QCSTData = await getQCSTDataDAO(db)
  DAO = Object.assign(QCSTData, DAO)
  const miband3Data = await getMiband3DataDAO(db)
  DAO = Object.assign(miband3Data, DAO)
  const po60Data = await getPO60DataDAO(db)
  DAO = Object.assign(po60Data, DAO)
  const peakflowData = await getPeakFlowDataDAO(db)
  DAO = Object.assign(peakflowData, DAO)
  const pos = await getPositionsDAO(db)
  DAO = Object.assign(pos, DAO)
  const ft = await getFingerTappingDAO(db)
  DAO = Object.assign(ft, DAO)
  // add new collections here
}
