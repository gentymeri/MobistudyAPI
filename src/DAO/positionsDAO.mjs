'use strict'

/**
 * This provides the data access for the environment data sent by patients.
 */

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

export default async function (db) {
  const collection = await utils.getCollection(db, 'positions')

  return {
    async getAllPositions (dataCallback) {
      const filter = ''
      const query = 'FOR data IN positions ' + filter + ' RETURN data'
      applogger.trace('Querying "' + query + '"')
      const cursor = await db.query(query)
      if (dataCallback) {
        while (cursor.hasNext) {
          const a = await cursor.next()
          dataCallback(a)
        }
      } else return cursor.all()
    },

    async getPositionsByUser (userKey, dataCallback) {
      const query =
        'FOR data IN positions FILTER data.userKey == @userKey RETURN data'
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

    async getPositionsByUserAndStudy (userKey, studyKey, dataCallback) {
      const query =
        'FOR data IN positions FILTER data.userKey == @userKey AND data.studyKey == @studyKey RETURN data'
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

    async getPositionsByStudy (studyKey, dataCallback) {
      const query =
        'FOR data IN positions FILTER data.studyKey == @studyKey RETURN data'
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

    async createPosition (position) {
      const meta = await collection.save(position)
      position._key = meta._key
      return position
    },

    async getOnePosition (_key) {
      const data = await collection.document(_key)
      return data
    },

    async deletePosition (_key) {
      await collection.remove(_key)
      return true
    },

    // deletes all data based on study
    async deletePositionsByStudy (studyKey) {
      const data = await this.getPositionsByStudy(studyKey)
      for (let i = 0; i < data.length; i++) {
        await this.deletePosition(data[i]._key)
      }
    },

    // deletes all data based on user
    async deletePositionsByUser (userKey) {
      const data = await this.getPositionsByUser(userKey)
      for (let i = 0; i < data.length; i++) {
        await this.deletePosition(data[i]._key)
      }
    }
  }
}
