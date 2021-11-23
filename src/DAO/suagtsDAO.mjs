'use strict'

/**
 * This provides the data access for the Study SUAGTData.
 */

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

const COLLECTIONNAME = 'suagts'

export default async function (db, logger) {
  const collection = await utils.getCollection(db, COLLECTIONNAME)

  return {
    suagtTransaction () {
      return COLLECTIONNAME
    },

    async getAllSuagts (dataCallback) {
      const query = `FOR data IN ${COLLECTIONNAME} RETURN data`
      applogger.trace('Querying "' + query + '"')
      const cursor = await db.query(query)
      if (dataCallback) {
        while (cursor.hasNext) {
          const a = await cursor.next()
          dataCallback(a)
        }
      } else return cursor.all()
    },

    async getSuagtsByUser (userKey, dataCallback) {
      const query = `FOR data IN ${COLLECTIONNAME} FILTER data.userKey == @userKey RETURN data`
      const bindings = { userKey: userKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      if (dataCallback) {
        while (cursor.hasNext) {
          const a = await cursor.next()
          dataCallback(a)
        }
      } else return cursor.all()
    },

    async getSuagtsByUserAndStudy (userKey, studyKey, dataCallback) {
      const query = `FOR data IN ${COLLECTIONNAME} FILTER data.userKey == @userKey AND data.studyKey == @studyKey RETURN data`
      const bindings = { userKey: userKey, studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      if (dataCallback) {
        while (cursor.hasNext) {
          const a = await cursor.next()
          dataCallback(a)
        }
      } else return cursor.all()
    },

    async getSuagtsDataByStudy (studyKey, dataCallback) {
      const query = `FOR data IN ${COLLECTIONNAME} FILTER data.studyKey == @studyKey RETURN data`
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
     * Create a new stand up and go test
     * @param newSuagt new Suagt
     * @param trx optional transaction
     * @returns promise with the new created Suagt
     */
    async createSuagts (newSuagt, trx) {
      let meta
      if (trx) {
        meta = await trx.step(() => collection.save(newSuagt))
      } else {
        meta = await collection.save(newSuagt)
      }
      applogger.trace(newSuagt, 'Creating stand up and go test with key ' + meta._key + '')

      newSuagt._key = meta._key
      return newSuagt
    },

    /**
     * Replaces a Suagt
     * @param _key key of the Suagt to replace
     * @param newData new Suagt object
     * @param trx optional transaction
     * @returns promise with replaced Suagt
     */
    async replaceSuagt (_key, newData, trx) {
      let meta
      if (trx) {
        meta = await trx.step(() => collection.replace(_key, newData))
      } else {
        meta = await collection.replace(_key, newData)
      }
      applogger.trace(newData, 'Replacing stand up and go test with key ' + _key + '')

      newData._key = meta._key
      return newData
    },

    async getOneSuagt (_key) {
      const SUAGTData = await collection.document(_key)
      return SUAGTData
    },

    // deletes SUAGTData
    async deleteSuagt (_key) {
      await collection.remove(_key)
      return true
    },

    // deletes all data based on study
    async deleteSuagtByStudy (studyKey) {
      const SUAGTData = await this.getSuagtsDataByStudy(studyKey)
      for (let i = 0; i < SUAGTData.length; i++) {
        await this.deleteSuagt(SUAGTData[i]._key)
      }
    },

    // deletes all data based on participant
    async deleteSuagtByUser (userKey) {
      const SUAGTData = await this.getSuagtsByUser(userKey)
      for (let i = 0; i < SUAGTData.length; i++) {
        await this.deleteSuagt(SUAGTData[i]._key)
      }
    }
  }
}
