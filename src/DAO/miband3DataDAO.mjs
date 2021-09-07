'use strict'

/**
* This provides the data access for the Study miband3Data.
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

export default async function (db) {
  const collection = await utils.getCollection(db, 'miband3Data')

  return {
    async getAllMiband3Data () {
      const filter = ''
      const query = 'FOR data IN miband3Data ' + filter + ' RETURN data'
      applogger.trace('Querying "' + query + '"')
      const cursor = await db.query(query)
      return cursor.all()
    },

    async getMiband3DataByUser (userKey) {
      const query = 'FOR data IN miband3Data FILTER data.userKey == @userKey RETURN data'
      const bindings = { userKey: userKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getMiband3DataByUserAndStudy (userKey, studyKey) {
      const query = 'FOR data IN miband3Data FILTER data.userKey == @userKey AND data.studyKey == @studyKey RETURN data'
      const bindings = { userKey: userKey, studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getMiband3DataByStudy (studyKey, dataCallback) {
      const query = 'FOR data IN miband3Data FILTER data.studyKey == @studyKey RETURN data'
      const bindings = { studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      if (dataCallback) {
        while (cursor.hasNext) {
          const a = await cursor.next()
          dataCallback(a)
        }
      } else return cursor.all()
    },

    async createMiband3Data (newMiband3Data) {
      const meta = await collection.save(newMiband3Data)
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
      const miband3Data = await this.getMiband3DataByStudy(studyKey)
      for (let i = 0; i < miband3Data.length; i++) {
        await this.deleteMiband3Data(miband3Data[i]._key)
      }
    },

    // deletes all data based on user
    async deleteMiband3DataByUser (userKey) {
      const miband3Data = await this.getMiband3DataByUser(userKey)
      for (let i = 0; i < miband3Data.length; i++) {
        await this.deleteMiband3Data(miband3Data[i]._key)
      }
    }
  }
}
