'use strict'

/**
* This provides the data access for the Study healthStoreData.
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

export default async function (db) {
  const collection = await utils.getCollection(db, 'healthStoreData')

  return {
    async getAllHealthStoreData () {
      const filter = ''
      const query = 'FOR data IN healthStoreData ' + filter + ' RETURN data'
      applogger.trace('Querying "' + query + '"')
      const cursor = await db.query(query)
      return cursor.all()
    },

    async getHealthStoreDataByUser (userKey) {
      const query = 'FOR data IN healthStoreData FILTER data.userKey == @userKey RETURN data'
      const bindings = { userKey: userKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getHealthStoreDataByUserAndStudy (userKey, studyKey) {
      const query = 'FOR data IN healthStoreData FILTER data.userKey == @userKey AND data.studyKey == @studyKey RETURN data'
      const bindings = { userKey: userKey, studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getHealthStoreDataByStudy (studyKey, dataCallback) {
      const query = 'FOR data IN healthStoreData FILTER data.studyKey == @studyKey RETURN data'
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

    async createHealthStoreData (newHealthStoreData) {
      const meta = await collection.save(newHealthStoreData)
      newHealthStoreData._key = meta._key
      return newHealthStoreData
    },

    async getOneHealthStoreData (_key) {
      const healthStoreData = await collection.document(_key)
      return healthStoreData
    },

    // deletes healthStoreData
    async deleteHealthStoreData (_key) {
      await collection.remove(_key)
      return true
    },

    // deletes all data based on study
    async deleteHealthStoreByStudy (studyKey) {
      const healthStoreData = await this.getHealthStoreDataByStudy(studyKey)
      for (let i = 0; i < healthStoreData.length; i++) {
        await this.deleteHealthStoreData(healthStoreData[i]._key)
      }
    },

    // deletes all data based on user key
    async deleteHealthStoreDataByUser (userKey) {
      const healthStoreData = await this.getHealthStoreDataByUser(userKey)
      for (let i = 0; i < healthStoreData.length; i++) {
        await this.deleteHealthStoreData(healthStoreData[i]._key)
      }
    }
  }
}
