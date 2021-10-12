'use strict'

/**
* This provides the data access for the Study healthStoreData.
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

const COLLECTIONNAME = 'healthStoreData'

export default async function (db) {
  const collection = await utils.getCollection(db, COLLECTIONNAME)

  return {
    healthStoreDataTransaction () {
      return COLLECTIONNAME
    },

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
        while (cursor.hasNext) {
          const a = await cursor.next()
          dataCallback(a)
        }
      } else return cursor.all()
    },

    /**
     * Creates new healthstore data
     * @param newHealthStoreData data to be created
     * @param trx optiona, transaction
     * @returns a promise with the new data created
     */
    async createHealthStoreData (newHealthStoreData, trx) {
      let meta
      if (trx) {
        meta = await trx.step(() => collection.save(newHealthStoreData))
      } else {
        meta = await collection.save(newHealthStoreData)
      }
      applogger.trace(newHealthStoreData, 'Creating health store data "' + meta._key + '"')

      newHealthStoreData._key = meta._key
      return newHealthStoreData
    },

    /**
     * Replace the healthstore data with a new one
     * @param _key the key of the data
     * @param newData the new data that will replace the old one
     * @param trx optional, transaction
     * @returns a promise with the new data
     */
    async replaceHealthStoreData (_key, newData, trx) {
      let meta
      if (trx) {
        meta = await trx.step(() => collection.replace(_key, newData))
      } else {
        meta = await collection.replace(_key, newData)
      }
      applogger.trace(newData, 'Replacing healthstore data "' + _key + '"')

      newData._key = meta._key
      return newData
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
