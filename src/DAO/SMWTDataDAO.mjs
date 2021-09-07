'use strict'

/**
* This provides the data access for the Study SMWTData.
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

export default async function (db, logger) {
  const collection = await utils.getCollection(db, 'SMWTData')

  return {
    async getAllSMWTData (dataCallback) {
      const filter = ''
      const query = 'FOR data IN SMWTData ' + filter + ' RETURN data'
      applogger.trace('Querying "' + query + '"')
      const cursor = await db.query(query)
      if (dataCallback) {
        while (cursor.hasNext()) {
          const a = await cursor.next()
          dataCallback(a)
        }
      } else return cursor.all()
    },

    async getSMWTDataByUser (userKey, dataCallback) {
      const query = 'FOR data IN SMWTData FILTER data.userKey == @userKey RETURN data'
      const bindings = { userKey: userKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      if (dataCallback) {
        while (cursor.hasNext()) {
          const a = await cursor.next()
          dataCallback(a)
        }
      } else return cursor.all()
    },

    async getSMWTDataByUserAndStudy (userKey, studyKey, dataCallback) {
      const query = 'FOR data IN SMWTData FILTER data.userKey == @userKey AND data.studyKey == @studyKey RETURN data'
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

    async getSMWTDataByStudy (studyKey, dataCallback) {
      const query = 'FOR data IN SMWTData FILTER data.studyKey == @studyKey RETURN data'
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

    async createSMWTData (newSMWTData) {
      const meta = await collection.save(newSMWTData)
      newSMWTData._key = meta._key
      return newSMWTData
    },

    async getOneSMWTData (_key) {
      const SMWTData = await collection.document(_key)
      return SMWTData
    },

    // deletes SMWTData
    async deleteSMWTData (_key) {
      await collection.remove(_key)
      return true
    },

    // deletes all data based on study
    async deleteSMWTDataByStudy (studyKey) {
      const SMWTData = await this.getSMWTDataByStudy(studyKey)
      for (let i = 0; i < SMWTData.length; i++) {
        await this.deleteSMWTData(SMWTData[i]._key)
      }
    },

    // deletes all data based on participant
    async deleteSMWTDataByUser (userKey) {
      const SMWTData = await this.getSMWTDataByUser(userKey)
      for (let i = 0; i < SMWTData.length; i++) {
        await this.deleteSMWTData(SMWTData[i]._key)
      }
    }
  }
}
