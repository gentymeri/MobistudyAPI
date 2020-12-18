'use strict'

/**
* This provides the data access for the audit log
*/
import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

export default async function (db) {
  let collection = await utils.getCollection(db, 'auditlogs')

  return {
    async addAuditLog (newLog) {
      let meta = await collection.save(newLog)
      newLog._key = meta._key
      return newLog
    },
    async getLogEventTypes () {
      let query = 'FOR log IN auditlogs RETURN DISTINCT log.event'
      applogger.trace('Querying "' + query + '"')
      let cursor = await db.query(query)
      return cursor.all()
    },
    async getAuditLogs (countOnly, after, before, eventType, studyKey, taskId, userEmail, sortDirection, offset, rowsPerPage) {
      let queryString = ''
      if (countOnly) {
        queryString = 'RETURN COUNT ( '
      }
      let bindings = {}
      queryString += `FOR log IN auditlogs `
      if (!countOnly || userEmail) {
        queryString += ` FOR user IN users
        FILTER user._key == log.userKey `
      }
      if (after && before) {
        queryString += `FILTER DATE_DIFF(log.timestamp, @after, 's') <=0 AND DATE_DIFF(log.timestamp, @before, 's') >=0 `
        bindings.after = after
        bindings.before = before
      }
      if (after && !before) {
        queryString += `FILTER DATE_DIFF(log.timestamp, @after, 's') <=0 `
        bindings.after = after
      }
      if (!after && before) {
        queryString += `FILTER DATE_DIFF(log.timestamp, @before, 's') >=0 `
        bindings.before = before
      }
      if (eventType) {
        queryString += `FILTER log.event == @eventType `
        bindings.eventType = eventType
      }
      if (studyKey) {
        queryString += `FILTER log.studyKey == @studyKey `
        bindings.studyKey = studyKey
      }
      if (taskId) {
        queryString += `FILTER log.taskId == @taskId `
        bindings.taskId = taskId
      }
      if (userEmail) {
        queryString += ` FILTER LIKE(user.email, CONCAT('%', @userEmail, '%'), true) `
        bindings.userEmail = userEmail
      }
      if (!countOnly) {
        if (!sortDirection) {
          sortDirection = 'DESC'
        }
        queryString += `SORT log.timestamp @sortDirection `
        bindings.sortDirection = sortDirection
        if (!!offset && !!rowsPerPage) {
          queryString += `LIMIT @offset, @rowsPerPage `
          bindings.offset = parseInt(offset)
          bindings.rowsPerPage = parseInt(rowsPerPage)
        }
      }

      if (countOnly) {
        queryString += ' RETURN 1 )'
      } else {
        queryString += ` RETURN {
          _key: log._key,
          timestamp: log.timestamp,
          event: log.event,
          userEmail: user.email,
          message: log.message,
          refData: log.refData,
          refKey: log.refKey,
          data: log.data
        }`
      }
      applogger.trace(bindings, 'Querying "' + queryString + '"')
      let cursor = await db.query(queryString, bindings)
      if (countOnly) {
        let counts = await cursor.all()
        if (counts.length) return '' + counts[0]
        else return undefined
      } else return cursor.all()
    },

    async getLogsByUser (userKey) {
      let bindings = { 'userKey': userKey }
      let query = 'FOR log IN auditlogs FILTER log.userKey == @userKey RETURN log'
      applogger.trace('Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    // deletes a log
    async deleteLog (_key) {
      await collection.remove(_key)
      return true
    },

    async deleteLogsByUser (userKey) {
      let bindings = { 'userKey': userKey }
      let query = 'FOR log IN auditlogs FILTER log.userKey == @userKey REMOVE log IN auditlogs'
      applogger.trace('Querying "' + query + '"')
      return db.query(query, bindings)
    }
  }
}
