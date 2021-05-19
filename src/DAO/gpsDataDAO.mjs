'use strict'

/**
* This provides the data access for the Study GPSData.
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

export default async function (db) {
  let collection = await utils.getCollection(db, 'gpsData')

  return {
    async getAllGPSData () {
      let filter = ''
      let query = 'FOR data IN gpsData ' + filter + ' RETURN data'
      applogger.trace('Querying "' + query + '"')
      let cursor = await db.query(query)
      return cursor.all()
    },

    async getGPSDataByUser (userKey) {
      var query = 'FOR data IN gpsData FILTER data.userKey == @userKey RETURN data'
      let bindings = { userKey: userKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getGPSDataByUserAndStudy (userKey, studyKey) {
      var query = 'FOR data IN gpsData FILTER data.userKey == @userKey AND data.studyKey == @studyKey RETURN data'
      let bindings = { userKey: userKey, studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getGPSDataByStudy (studyKey) {
      var query = 'FOR data IN gpsData FILTER data.studyKey == @studyKey RETURN data'
      let bindings = { studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async createGPSData (newGPSData) {
      let meta = await collection.save(newGPSData)
      newGPSData._key = meta._key
      return newGPSData
    },

    async getOneGPSData (_key) {
      const gpsData = await collection.document(_key)
      return gpsData
    },

    // deletes GPSData
    async deleteGPSData (_key) {
      await collection.remove(_key)
      return true
    },

    // deletes all data based on study
    async deleteGPSDataByStudy (studyKey) {
      let gpsData = await this.getGPSDataByStudy(studyKey)
      for (let i = 0; i < gpsData.length; i++) {
        await this.deleteGPSData(gpsData[i]._key)
      }
    },

    // deletes all data based on user
    async deleteGPSDataByUser (userKey) {
      let gpsData = await this.getGPSDataByUser(userKey)
      for (let i = 0; i < gpsData.length; i++) {
        await this.deleteGPSData(gpsData[i]._key)
      }
    }
  }
}
