'use strict'

/**
* This provides the data access for the Study miband3Data.
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

export default async function (db) {
  let collection = await utils.getCollection(db, 'miband3Data')

  return {
    async getAllMiband3Data () {
      let filter = ''
      let query = 'FOR data IN miband3Data ' + filter + ' RETURN data'
      applogger.trace('Querying "' + query + '"')
      let cursor = await db.query(query)
      return cursor.all()
    },

    async getMiband3DataByUser (userKey) {
      var query = 'FOR data IN miband3Data FILTER data.userKey == @userKey RETURN data'
      let bindings = { userKey: userKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getMiband3DataByUserAndStudy (userKey, studyKey) {
      var query = 'FOR data IN miband3Data FILTER data.userKey == @userKey AND data.studyKey == @studyKey RETURN data'
      let bindings = { userKey: userKey, studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getMiband3DataByStudy (studyKey) {
      var query = 'FOR data IN miband3Data FILTER data.studyKey == @studyKey RETURN data'
      let bindings = { studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async createMiband3Data (newMiband3Data) {
      let meta = await collection.save(newMiband3Data)
      newMiband3Data._key = meta._key
      return newMiband3Data
    },

    async getOneMiband3Data (_key) {
      const miband3Data = await collection.document(_key)
      return miband3Data
    },

    // deletes miband3Data
    async deleteMiband3Data (_key) {
      await collection.remove(_key)
      return true
    },

    // deletes all data based on study
    async deleteMiband3DataByStudy (studyKey) {
      let miband3Data = await this.getMiband3DataByStudy(studyKey)
      for(let i = 0; i < miband3Data.length; i++) {
        await this.deleteMiband3Data(miband3Data[i]._key)
      }
    },

    // deletes all data based on participant
    async deleteMiband3DataByParticipant (userKey) {
      let miband3Data = await this.getMiband3DataByUser(userKey)
      for(let i = 0; i < miband3Data.length; i++) {
        await this.deleteMiband3Data(miband3Data[i]._key)
      }
    }
  }
}
