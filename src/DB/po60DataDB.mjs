'use strict'

/**
* This provides the data access for the Study PO60Data.
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

export default async function (db) {
  let collection = await utils.getCollection(db, 'po60Data')

  return {
    async getAllPO60Data () {
      let filter = ''
      let query = 'FOR data IN po60Data ' + filter + ' RETURN data'
      applogger.trace('Querying "' + query + '"')
      let cursor = await db.query(query)
      return cursor.all()
    },

    async getPO60DataByUser (userKey) {
      var query = 'FOR data IN po60Data FILTER data.userKey == @userKey RETURN data'
      let bindings = { userKey: userKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getPO60DataByUserAndStudy (userKey, studyKey) {
      var query = 'FOR data IN po60Data FILTER data.userKey == @userKey AND data.studyKey == @studyKey RETURN data'
      let bindings = { userKey: userKey, studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getPO60DataByStudy (studyKey) {
      var query = 'FOR data IN po60Data FILTER data.studyKey == @studyKey RETURN data'
      let bindings = { studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async createPO60Data (newPO60Data) {
      let meta = await collection.save(newPO60Data)
      newPO60Data._key = meta._key
      return newPO60Data
    },

    async getOnePO60Data (_key) {
      const po60Data = await collection.document(_key)
      return po60Data
    },

    // deletes PO60Data
    async deletePO60Data (_key) {
      await collection.remove(_key)
      return true
    },

    // deletes all data based on study
    async deletePO60DataByStudy (studyKey) {
      let po60Data = await this.getPO60DataByStudy(studyKey)
      for (let i = 0; i < po60Data.length; i++) {
        await this.deletePO60Data(po60Data[i]._key)
      }
    },

    // deletes all data based on user
    async deletePO60DataByUser (userKey) {
      let po60Data = await this.getPO60DataByUser(userKey)
      for (let i = 0; i < po60Data.length; i++) {
        await this.deletePO60Data(po60Data[i]._key)
      }
    }
  }
}
