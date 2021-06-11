'use strict'

/**
* This provides the data access for the Study PeakFlowData.
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

export default async function (db) {
  const collection = await utils.getCollection(db, 'peakFlows')

  return {
    async getAllPeakFlows () {
      const filter = ''
      const query = 'FOR data IN peakFlows ' + filter + ' RETURN data'
      applogger.trace('Querying "' + query + '"')
      const cursor = await db.query(query)
      return cursor.all()
    },

    async getPeakFlowsByUser (userKey) {
      const query = 'FOR data IN peakFlows FILTER data.userKey == @userKey RETURN data'
      const bindings = { userKey: userKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getPeakFlowsByUserAndStudy (userKey, studyKey) {
      const query = 'FOR data IN peakFlows FILTER data.userKey == @userKey AND data.studyKey == @studyKey RETURN data'
      const bindings = { userKey: userKey, studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getPeakFlowsByStudy (studyKey) {
      const query = 'FOR data IN peakFlows FILTER data.studyKey == @studyKey RETURN data'
      const bindings = { studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async createPeakFlow (newPeakFlowData) {
      const meta = await collection.save(newPeakFlowData)
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
      const peakflowData = await this.getPeakFlowsByStudy(studyKey)
      for (let i = 0; i < peakflowData.length; i++) {
        await this.deletePeakFlowData(peakflowData[i]._key)
      }
    },

    // deletes all data based on user
    async deletePeakFlowDataByUser (userKey) {
      const peakflowData = await this.getPeakFlowsByUser(userKey)
      for (let i = 0; i < peakflowData.length; i++) {
        await this.deletePeakFlowData(peakflowData[i]._key)
      }
    }
  }
}
