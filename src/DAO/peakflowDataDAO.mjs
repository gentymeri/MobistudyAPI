'use strict'

/**
* This provides the data access for the Study PeakFlowData.
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

export default async function (db) {
  let collection = await utils.getCollection(db, 'peakflowData')

  return {
    async getAllPeakFlows () {
      let filter = ''
      let query = 'FOR data IN peakflowData ' + filter + ' RETURN data'
      applogger.trace('Querying "' + query + '"')
      let cursor = await db.query(query)
      return cursor.all()
    },

    async getPeakFlowsByUser (userKey) {
      var query = 'FOR data IN peakflowData FILTER data.userKey == @userKey RETURN data'
      let bindings = { userKey: userKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getPeakFlowsByUserAndStudy (userKey, studyKey) {
      var query = 'FOR data IN peakflowData FILTER data.userKey == @userKey AND data.studyKey == @studyKey RETURN data'
      let bindings = { userKey: userKey, studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getPeakFlowsByStudy (studyKey) {
      var query = 'FOR data IN peakflowData FILTER data.studyKey == @studyKey RETURN data'
      let bindings = { studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async createPeakFlow (newPeakFlowData) {
      let meta = await collection.save(newPeakFlowData)
      newPeakFlowData._key = meta._key
      return newPeakFlowData
    },

    async getOnePeakFlowData (_key) {
      const peakflowData = await collection.document(_key)
      return peakflowData
    },

    // deletes PeakFlowData
    async deletePeakFlowData (_key) {
      await collection.remove(_key)
      return true
    },

    // deletes all data based on study
    async deletePeakFlowDataByStudy (studyKey) {
      let peakflowData = await this.getPeakFlowsByStudy(studyKey)
      for (let i = 0; i < peakflowData.length; i++) {
        await this.deletePeakFlowData(peakflowData[i]._key)
      }
    },

    // deletes all data based on user
    async deletePeakFlowDataByUser (userKey) {
      let peakflowData = await this.getPeakFlowsByUser(userKey)
      for (let i = 0; i < peakflowData.length; i++) {
        await this.deletePeakFlowData(peakflowData[i]._key)
      }
    }
  }
}
