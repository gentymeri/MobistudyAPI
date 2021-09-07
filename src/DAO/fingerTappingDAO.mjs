'use strict'

/**
 * This provides the data access for the Study TappingData.
 */
import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

const CollectionName = 'fingerTappings'

export default async function (db) {
  const collection = await utils.getCollection(db, CollectionName)

  return {
    async getAllFingerTappings (dataCallback) {
      const filter = ''
      const query = 'FOR data IN ' + CollectionName + ' ' + filter + ' RETURN data'
      applogger.trace('Querying "' + query + '"')
      const cursor = await db.query(query)
      if (dataCallback) {
        while (cursor.hasNext) {
          const a = await cursor.next()
          dataCallback(a)
        }
      } else return cursor.all()
    },

    async getFingerTappingsByUser (userKey, dataCallback) {
      const query = 'FOR data IN ' + CollectionName + ' FILTER data.userKey == @userKey RETURN data'
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

    async getFingerTappingsByUserAndStudy (userKey, studyKey, dataCallback) {
      const query = 'FOR data IN ' + CollectionName + ' FILTER data.userKey == @userKey AND data.studyKey == @studyKey RETURN data'
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

    async getFingerTappingsByStudy (studyKey, dataCallback) {
      const query = 'FOR data IN ' + CollectionName + ' FILTER data.studyKey == @studyKey RETURN data'
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

    async createFingerTapping (newtappingData) {
      const meta = await collection.save(newtappingData)
      newtappingData._key = meta._key
      return newtappingData
    },

    async getOneFingerTapping (_key) {
      const tappingData = await collection.document(_key)
      return tappingData
    },

    // deletes tappingData
    async deleteFingerTapping (_key) {
      await collection.remove(_key)
      return true
    },

    // deletes all data based on study
    async deleteFingerTappingsByStudy (studyKey) {
      const tappingData = await this.getFingerTappingsByStudy(studyKey)
      for (let i = 0; i < tappingData.length; i++) {
        await this.deleteFingerTapping(tappingData[i]._key)
      }
    },

    // deletes all data based on user
    async deleteFingerTappingsByUser (userKey) {
      const tappingData = await this.getFingerTappingsByUser(userKey)
      for (let i = 0; i < tappingData.length; i++) {
        await this.deleteFingerTapping(tappingData[i]._key)
      }
    }
  }
}
