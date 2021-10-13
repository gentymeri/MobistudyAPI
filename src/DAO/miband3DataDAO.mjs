'use strict'

/**
* This provides the data access for the Study miband3Data.
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

const COLLECTIONNAME = 'miband3Data'

export default async function (db) {
  const collection = await utils.getCollection(db, COLLECTIONNAME)

  return {
    miband3DataTransaction () {
      return COLLECTIONNAME
    },

    async getAllMiband3Data (dataCallback) {
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

    async getMiband3DataByUser (userKey, dataCallback) {
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

    async getMiband3DataByUserAndStudy (userKey, studyKey, dataCallback) {
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

    async getMiband3DataByStudy (studyKey, dataCallback) {
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
     * Create a new Mibadn3 data
     * @param newMiband3Data new data to be created
     * @param trx used for transactions, optional
     * @returns a promise wth the newly created data
     */
    async createMiband3Data (newMiband3Data, trx) {
      let meta
      if (trx) {
        meta = await trx.step(() => collection.save(newMiband3Data))
      } else {
        meta = await collection.save(newMiband3Data)
      }
      applogger.trace(newMiband3Data, 'Creating miband3 data with key ' + meta._key + '')

      newMiband3Data._key = meta._key
      return newMiband3Data
    },

    /**
     * Replace existing miband3 data with new data
     * @param _key key of the old data
     * @param newData new data
     * @param trx optional, used for transactions
     * @returns a promise with the new data
     */
    async replaceMiband3Data (_key, newData, trx) {
      let meta
      if (trx) {
        meta = await trx.step(() => collection.replace(_key, newData))
      } else {
        meta = await collection.replace(_key, newData)
      }
      applogger.trace(newData, 'Replacing miband3 data with key ' + _key + '')

      newData._key = meta._key
      return newData
    },

    async getOneMiband3Data (_key) {
      const miband3Data = await collection.document(_key)
      return miband3Data
    },

    // deletes miband3Data
    async deleteMiband3Data (_key) {
      await collection.remove(_key)
      return true
    },

    // deletes all data based on study
    async deleteMiband3DataByStudy (studyKey) {
      const miband3Data = await this.getMiband3DataByStudy(studyKey)
      for (let i = 0; i < miband3Data.length; i++) {
        await this.deleteMiband3Data(miband3Data[i]._key)
      }
    },

    // deletes all data based on user
    async deleteMiband3DataByUser (userKey) {
      const miband3Data = await this.getMiband3DataByUser(userKey)
      for (let i = 0; i < miband3Data.length; i++) {
        await this.deleteMiband3Data(miband3Data[i]._key)
      }
    }
  }
}
