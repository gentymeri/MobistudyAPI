'use strict'

/**
* This provides the data access for the Study QCSTData.
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

export default async function (db, logger) {
  const collection = await utils.getCollection(db, 'QCSTData')

  return {
    async getAllQCSTData () {
      const filter = ''
      const query = 'FOR data IN QCSTData ' + filter + ' RETURN data'
      applogger.trace('Querying "' + query + '"')
      const cursor = await db.query(query)
      return cursor.all()
    },

    async getQCSTDataByUser (userKey) {
      const query = 'FOR data IN QCSTData FILTER data.userKey == @userKey RETURN data'
      const bindings = { userKey: userKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getQCSTDataByUserAndStudy (userKey, studyKey, dataCallback) {
      const query = 'FOR data IN QCSTData FILTER data.userKey == @userKey AND data.studyKey == @studyKey RETURN data'
      const bindings = { userKey: userKey, studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      if (dataCallback) {
        while (cursor.hasNext()) {
          const a = await cursor.next()
          dataCallback(a)
        }
      } else return cursor.all()
    },

    async getQCSTDataByStudy (studyKey, dataCallback) {
      const query = 'FOR data IN QCSTData FILTER data.studyKey == @studyKey RETURN data'
      const bindings = { studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      if (dataCallback) {
        while (cursor.hasNext()) {
          const a = await cursor.next()
          dataCallback(a)
        }
      } else return cursor.all()
    },

    async createQCSTData (newQCSTData) {
      const meta = await collection.save(newQCSTData)
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
      const QCSTData = await this.getQCSTDataByStudy(studyKey)
      for (let i = 0; i < QCSTData.length; i++) {
        await this.deleteQCSTData(QCSTData[i]._key)
      }
    },

    // deletes all data based on user key
    async deleteQCSTDataByUser (userKey) {
      const QCSTData = await this.getQCSTDataByUser(userKey)
      for (let i = 0; i < QCSTData.length; i++) {
        await this.deleteQCSTData(QCSTData[i]._key)
      }
    }
  }
}
