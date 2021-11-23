'use strict'

/**
 * This provides the data access for the Study TUGTData.
 */

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

const COLLECTIONNAME = 'tugts'

export default async function (db, logger) {
  const collection = await utils.getCollection(db, COLLECTIONNAME)

  return {
    tugtTransaction () {
      return COLLECTIONNAME
    },

    async getAllTugts (dataCallback) {
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

    async getTugtsByUser (userKey, dataCallback) {
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

    async getTugtsByUserAndStudy (userKey, studyKey, dataCallback) {
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

    async getTugtsDataByStudy (studyKey, dataCallback) {
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
     * Create a new Timed up & Go Test
     * @param newTugt new Tugt
     * @param trx optional transaction
     * @returns promise with the new created Tugt
     */
    async createTugts (newTugt, trx) {
      let meta
      if (trx) {
        meta = await trx.step(() => collection.save(newTugt))
      } else {
        meta = await collection.save(newTugt)
      }
      applogger.trace(newTugt, 'Creating timed up & go test with key ' + meta._key + '')

      newTugt._key = meta._key
      return newTugt
    },

    /**
     * Replaces a Tugt
     * @param _key key of the Tugt to replace
     * @param newData new Tugt object
     * @param trx optional transaction
     * @returns promise with replaced Tugt
     */
    async replaceTugt (_key, newData, trx) {
      let meta
      if (trx) {
        meta = await trx.step(() => collection.replace(_key, newData))
      } else {
        meta = await collection.replace(_key, newData)
      }
      applogger.trace(newData, 'Replacing timed up & go test with key ' + _key + '')

      newData._key = meta._key
      return newData
    },

    async getOneTugt (_key) {
      const TUGTData = await collection.document(_key)
      return TUGTData
    },

    // deletes TUGTData
    async deleteTugt (_key) {
      await collection.remove(_key)
      return true
    },

    // deletes all data based on study
    async deleteTugtByStudy (studyKey) {
      const TUGTData = await this.getTugtsDataByStudy(studyKey)
      for (let i = 0; i < TUGTData.length; i++) {
        await this.deleteTugt(TUGTData[i]._key)
      }
    },

    // deletes all data based on participant
    async deleteTugtByUser (userKey) {
      const TUGTData = await this.getTugtsByUser(userKey)
      for (let i = 0; i < TUGTData.length; i++) {
        await this.deleteTugt(TUGTData[i]._key)
      }
    }
  }
}
