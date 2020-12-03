'use strict'

/**
* This provides the data access for the Study SMWTData.
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

export default async function (db, logger) {
  let collection = await utils.getCollection(db, 'SMWTData')

  return {
    async getAllSMWTData () {
      let filter = ''
      let query = 'FOR data IN SMWTData ' + filter + ' RETURN data'
      applogger.trace('Querying "' + query + '"')
      let cursor = await db.query(query)
      return cursor.all()
    },

    async getSMWTDataByUser (userKey) {
      var query = 'FOR data IN SMWTData FILTER data.userKey == @userKey RETURN data'
      let bindings = { userKey: userKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getSMWTDataByUserAndStudy (userKey, studyKey) {
      var query = 'FOR data IN SMWTData FILTER data.userKey == @userKey AND data.studyKey == @studyKey RETURN data'
      let bindings = { userKey: userKey, studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getSMWTDataByStudy (studyKey) {
      var query = 'FOR data IN SMWTData FILTER data.studyKey == @studyKey RETURN data'
      let bindings = { studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async createSMWTData (newSMWTData) {
      let meta = await collection.save(newSMWTData)
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
      let SMWTData = await this.getSMWTDataByStudy(studyKey)
      for(let i = 0; i < SMWTData.length; i++) {
        await this.deleteSMWTData(SMWTData[i]._key)
      }
    },

    // deletes all data based on participant
    async deleteSMWTDataByParticipant (userKey) {
      let SMWTData = await this.getSMWTDataByUser(userKey)
      for(let i = 0; i < SMWTData.length; i++) {
        await this.deleteSMWTData(SMWTData[i]._key)
      }
    }
  }
}
