'use strict'

/**
 * This provides the data access for the environment data sent by patients.
 */

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

export default async function (db) {
  const collection = await utils.getCollection(db, 'environmentSamples')

  return {
    async getAllEnvironmentSamples () {
      const filter = ''
      const query = 'FOR data IN environmentSamples ' + filter + ' RETURN data'
      applogger.trace('Querying "' + query + '"')
      const cursor = await db.query(query)
      return cursor.all()
    },

    async getEnvironmentSamplesByUser (userKey) {
      const query =
        'FOR data IN environmentSamples FILTER data.userKey == @userKey RETURN data'
      const bindings = { userKey: userKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getEnvironmentSamplesByUserAndStudy (userKey, studyKey) {
      const query =
        'FOR data IN environmentSamples FILTER data.userKey == @userKey AND data.studyKey == @studyKey RETURN data'
      const bindings = { userKey: userKey, studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getEnvironmentSamplesByStudy (studyKey) {
      const query =
        'FOR data IN environmentSamples FILTER data.studyKey == @studyKey RETURN data'
      const bindings = { studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async createEnvironmentSamples (environmentSamples) {
      const meta = await collection.save(environmentSamples)
      environmentSamples._key = meta._key
      return environmentSamples
    },

    async getOneEnvironmentSample (_key) {
      const data = await collection.document(_key)
      return data
    },

    async deleteEnvironmentSample (_key) {
      await collection.remove(_key)
      return true
    },

    // deletes all data based on study
    async deleteEnvironmentSamplesByStudy (studyKey) {
      const data = await this.getEnvironmentSampleByStudy(studyKey)
      for (let i = 0; i < data.length; i++) {
        await this.deleteEnvironmentSample(data[i]._key)
      }
    },

    // deletes all data based on user
    async deleteEnvironmentSamplesByUser (userKey) {
      const data = await this.getEnvironmentSampleByUser(userKey)
      for (let i = 0; i < data.length; i++) {
        await this.deleteEnvironmentSample(data[i]._key)
      }
    }
  }
}
