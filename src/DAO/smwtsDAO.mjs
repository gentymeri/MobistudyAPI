'use strict'

/**
* This provides the data access for the Study SMWTData.
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

const COLLECTIONNAME = 'smwts'

export default async function (db, logger) {
  const collection = await utils.getCollection(db, COLLECTIONNAME)

  return {
    smwtTransaction () {
      return COLLECTIONNAME
    },

    async getAllSmwts (dataCallback) {
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

    async getSmwtsByUser (userKey, dataCallback) {
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

    async getSmwtsByUserAndStudy (userKey, studyKey, dataCallback) {
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

    async getSmwtsDataByStudy (studyKey, dataCallback) {
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
     * Create a new six minute walk test
     * @param newSmwt new 6mwt
     * @param trx optional transaction
     * @returns promise with the new created smwt
     */
    async createSmwt (newSmwt, trx) {
      let meta
      if (trx) {
        meta = await trx.step(() => collection.save(newSmwt))
      } else {
        meta = await collection.save(newSmwt)
      }
      applogger.trace(newSmwt, 'Creating six minute walk test with key ' + meta._key + '')

      newSmwt._key = meta._key
      return newSmwt
    },

    /**
     * Replaces a 6mwt
     * @param _key key of the 6mwt to replace
     * @param newData new 6mwt obejct
     * @param trx optional transaction
     * @returns promise with replaced 6mwt
     */
    async replaceSmwt (_key, newData, trx) {
      let meta
      if (trx) {
        meta = await trx.step(() => collection.replace(_key, newData))
      } else {
        meta = await collection.replace(_key, newData)
      }
      applogger.trace(newData, 'Replacing six minute walk test with key ' + _key + '')

      newData._key = meta._key
      return newData
    },

    async getOneSmwt (_key) {
      const SMWTData = await collection.document(_key)
      return SMWTData
    },

    // deletes SMWTData
    async deleteSmwt (_key) {
      await collection.remove(_key)
      return true
    },

    // deletes all data based on study
    async deleteSmwtByStudy (studyKey) {
      const SMWTData = await this.getSmwtsDataByStudy(studyKey)
      for (let i = 0; i < SMWTData.length; i++) {
        await this.deleteSmwt(SMWTData[i]._key)
      }
    },

    // deletes all data based on participant
    async deleteSmwtByUser (userKey) {
      const SMWTData = await this.getSmwtsByUser(userKey)
      for (let i = 0; i < SMWTData.length; i++) {
        await this.deleteSmwt(SMWTData[i]._key)
      }
    }
  }
}
