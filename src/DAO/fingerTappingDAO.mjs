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
    fingerTappingTransaction () {
      return CollectionName
    },

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

    // creates new finger tapping data
    // trx: optional, for transactions
    async createFingerTapping (newtappingData, trx) {
      let meta
      if (trx) {
        meta = await trx.step(() => collection.save(newtappingData))
      } else {
        meta = await collection.save(newtappingData)
      }
      applogger.trace(newtappingData, 'Creating finger tapping "' + meta._key + '"')

      newtappingData._key = meta._key
      return newtappingData
    },

    // udpates a study, we assume the _key is the correct one
    // trx: optional, for transactions
    async replaceFingerTapping (_key, newtappingData, trx) {
      let meta
      if (trx) {
        meta = await trx.step(() => collection.replace(_key, newtappingData))
      } else {
        meta = await collection.replace(_key, newtappingData)
      }
      applogger.trace(newtappingData, 'Replacing finger tapping "' + _key + '"')

      newtappingData._key = meta._key
      return newtappingData
    },

    async getOneFingerTapping (_key) {
      const tappingData = await collection.document(_key)
      return tappingData
    },

    // deletes tappingData
    async deleteFingerTapping (_key, trx) {
      if (trx) {
        await trx.step(() => collection.remove(_key))
      } else {
        await collection.remove(_key)
      }
      applogger.trace('Deleting finger tapping "' + _key + '"')
      return true
    },

    // deletes all data based on study
    async deleteFingerTappingsByStudy (studyKey) {
      applogger.trace('Deleting all finger tapping by study "' + studyKey + '"')
      const tappingData = await this.getFingerTappingsByStudy(studyKey)
      for (let i = 0; i < tappingData.length; i++) {
        const ftKey = tappingData[i]._key
        applogger.trace('Deleting finger tapping "' + ftKey + '"')
        await this.deleteFingerTapping(ftKey)
      }
    },

    // deletes all data based on user
    async deleteFingerTappingsByUser (userKey) {
      applogger.trace('Deleting all finger tapping by user "' + userKey + '"')
      const tappingData = await this.getFingerTappingsByUser(userKey)
      for (let i = 0; i < tappingData.length; i++) {
        const ftKey = tappingData[i]._key
        applogger.trace('Deleting finger tapping "' + ftKey + '"')
        await this.deleteFingerTapping(ftKey)
      }
    }
  }
}
