'use strict'

/**
 * This provides the data access for the Study HoldPhoneData.
 */

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

const COLLECTIONNAME = 'HoldPhone'

export default async function (db, logger) {
  const collection = await utils.getCollection(db, COLLECTIONNAME)

  return {
    HoldPhoneTransaction () {
      return COLLECTIONNAME
    },

    async getAllHoldPhone (dataCallback) {
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

    async getHoldPhoneByUser (userKey, dataCallback) {
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

    async getHoldPhoneByUserAndStudy (userKey, studyKey, dataCallback) {
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

    async getHoldPhoneDataByStudy (studyKey, dataCallback) {
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
     * @param newHoldPhone new HoldPhone
     * @param trx optional transaction
     * @returns promise with the new created HoldPhone
     */
    async createHoldPhone (newHoldPhone, trx) {
      let meta
      if (trx) {
        meta = await trx.step(() => collection.save(newHoldPhone))
      } else {
        meta = await collection.save(newHoldPhone)
      }
      applogger.trace(newHoldPhone, 'Creating timed up & go test with key ' + meta._key + '')

      newHoldPhone._key = meta._key
      return newHoldPhone
    },

    /**
     * Replaces a holdPhone
     * @param _key key of the holdPhone to replace
     * @param newData new holdPhone object
     * @param trx optional transaction
     * @returns promise with replaced holdPhone
     */
    async replaceHoldPhone (_key, newData, trx) {
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

    async getOneHoldPhone (_key) {
      const HoldPhoneData = await collection.document(_key)
      return HoldPhoneData
    },

    // deletes HoldPhoneData
    async deleteHoldPhone (_key) {
      await collection.remove(_key)
      return true
    },

    // deletes all data based on study
    async deleteHoldPhoneByStudy (studyKey) {
      const HoldPhoneData = await this.getHoldPhoneDataByStudy(studyKey)
      for (let i = 0; i < HoldPhoneData.length; i++) {
        await this.deleteHoldPhone(HoldPhoneData[i]._key)
      }
    },

    // deletes all data based on participant
    async deleteHoldPhoneByUser (userKey) {
      const HoldPhoneData = await this.getHoldPhoneByUser(userKey)
      for (let i = 0; i < HoldPhoneData.length; i++) {
        await this.deleteHoldPhone(HoldPhoneData[i]._key)
      }
    }
  }
}
