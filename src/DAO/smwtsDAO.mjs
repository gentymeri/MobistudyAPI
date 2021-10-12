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

    async createSmwt (newSMWTData) {
      const meta = await collection.save(newSMWTData)
      newSMWTData._key = meta._key
      return newSMWTData
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
