'use strict'

/**
* This provides the data access for the Study PO60Data.
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

export default async function (db) {
  const collection = await utils.getCollection(db, 'po60Data')

  return {
    async getAllPO60Data () {
      const filter = ''
      const query = 'FOR data IN po60Data ' + filter + ' RETURN data'
      applogger.trace('Querying "' + query + '"')
      const cursor = await db.query(query)
      return cursor.all()
    },

    async getPO60DataByUser (userKey) {
      const query = 'FOR data IN po60Data FILTER data.userKey == @userKey RETURN data'
      const bindings = { userKey: userKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getPO60DataByUserAndStudy (userKey, studyKey) {
      const query = 'FOR data IN po60Data FILTER data.userKey == @userKey AND data.studyKey == @studyKey RETURN data'
      const bindings = { userKey: userKey, studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getPO60DataByStudy (studyKey, dataCallback) {
      const query = 'FOR data IN po60Data FILTER data.studyKey == @studyKey RETURN data'
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

    async createPO60Data (newPO60Data) {
      const meta = await collection.save(newPO60Data)
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
      const po60Data = await this.getPO60DataByStudy(studyKey)
      for (let i = 0; i < po60Data.length; i++) {
        await this.deletePO60Data(po60Data[i]._key)
      }
    },

    // deletes all data based on user
    async deletePO60DataByUser (userKey) {
      const po60Data = await this.getPO60DataByUser(userKey)
      for (let i = 0; i < po60Data.length; i++) {
        await this.deletePO60Data(po60Data[i]._key)
      }
    }
  }
}
