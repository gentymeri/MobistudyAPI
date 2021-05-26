'use strict'

/**
* This provides the data access for the Study QCSTData.
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

export default async function (db, logger) {
  let collection = await utils.getCollection(db, 'QCSTData')

  return {
    async getAllQCSTData () {
      let filter = ''
      let query = 'FOR data IN QCSTData ' + filter + ' RETURN data'
      applogger.trace('Querying "' + query + '"')
      let cursor = await db.query(query)
      return cursor.all()
    },

    async getQCSTDataByUser (userKey) {
      var query = 'FOR data IN QCSTData FILTER data.userKey == @userKey RETURN data'
      let bindings = { userKey: userKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getQCSTDataByUserAndStudy (userKey, studyKey) {
      var query = 'FOR data IN QCSTData FILTER data.userKey == @userKey AND data.studyKey == @studyKey RETURN data'
      let bindings = { userKey: userKey, studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getQCSTDataByStudy (studyKey) {
      var query = 'FOR data IN QCSTData FILTER data.studyKey == @studyKey RETURN data'
      let bindings = { studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async createQCSTData (newQCSTData) {
      let meta = await collection.save(newQCSTData)
      newQCSTData._key = meta._key
      return newQCSTData
    },

    async getOneQCSTData (_key) {
      const QCSTData = await collection.document(_key)
      return QCSTData
    },

    // deletes QCSTData
    async deleteQCSTData (_key) {
      await collection.remove(_key)
      return true
    },

    // deletes all data based on study
    async deleteQCSTDataByStudy (studyKey) {
      let QCSTData = await this.getQCSTDataByStudy(studyKey)
      for (let i = 0; i < QCSTData.length; i++) {
        await this.deleteQCSTData(QCSTData[i]._key)
      }
    },

    // deletes all data based on user key
    async deleteQCSTDataByUser (userKey) {
      let QCSTData = await this.getQCSTDataByUser(userKey)
      for (let i = 0; i < QCSTData.length; i++) {
        await this.deleteQCSTData(QCSTData[i]._key)
      }
    }
  }
}
