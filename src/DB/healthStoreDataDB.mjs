'use strict'

/**
* This provides the data access for the Study healthStoreData.
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

export default async function (db) {
  let collection = await utils.getCollection(db, 'healthStoreData')

  return {
    async getAllHealthStoreData () {
      let filter = ''
      let query = 'FOR data IN healthStoreData ' + filter + ' RETURN data'
      applogger.trace('Querying "' + query + '"')
      let cursor = await db.query(query)
      return cursor.all()
    },

    async getHealthStoreDataByUser (userKey) {
      var query = 'FOR data IN healthStoreData FILTER data.userKey == @userKey RETURN data'
      let bindings = { userKey: userKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getHealthStoreDataByUserAndStudy (userKey, studyKey) {
      var query = 'FOR data IN healthStoreData FILTER data.userKey == @userKey AND data.studyKey == @studyKey RETURN data'
      let bindings = { userKey: userKey, studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getHealthStoreDataByStudy (studyKey) {
      var query = 'FOR data IN healthStoreData FILTER data.studyKey == @studyKey RETURN data'
      let bindings = { studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async createHealthStoreData (newHealthStoreData) {
      let meta = await collection.save(newHealthStoreData)
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
      let healthStoreData = await this.getHealthStoreDataByStudy(studyKey)
      for (let i = 0; i < healthStoreData.length; i++) {
        await this.deleteHealthStoreData(healthStoreData[i]._key)
      }
    },

    // deletes all data based on user key
    async deleteHealthStoreDataByUser (userKey) {
      let healthStoreData = await this.getHealthStoreDataByUser(userKey)
      for (let i = 0; i < healthStoreData.length; i++) {
        await this.deleteHealthStoreData(healthStoreData[i]._key)
      }
    }
  }
}
