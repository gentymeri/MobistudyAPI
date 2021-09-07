'use strict'

/**
* This provides the data access for the Study answers.
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

export default async function (db) {
  const collection = await utils.getCollection(db, 'answers')

  return {
    async getAllAnswers () {
      const filter = ''

      // TODO: use LIMIT @offset, @count in the query for pagination

      const query = 'FOR answer in answers ' + filter + ' RETURN answer'
      applogger.trace('Querying "' + query + '"')
      const cursor = await db.query(query)
      return cursor.all()
    },

    async getAnswersByUser (userKey) {
      const filter = 'FILTER answer.userKey == @userKey'
      const query = 'FOR answer IN answers ' + filter + ' RETURN answer'
      const bindings = { userKey: userKey }
      applogger.trace('Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getAnswersByUserAndStudy (userKey, studyKey) {
      const query = 'FOR answer IN answers FILTER answer.userKey == @userKey AND answer.studyKey == @studyKey RETURN answer'
      const bindings = { userKey: userKey, studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getAnswersByStudy (studyKey, dataCallback) {
      const query = 'FOR answer IN answers FILTER answer.studyKey == @studyKey RETURN answer'
      const bindings = { studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      if (dataCallback) {
        while (cursor.hasNext()) {
          const a = await cursor.next()
          dataCallback(a)
        }
      } else return cursor.all()
    },

    async createAnswer (newanswer) {
      const meta = await collection.save(newanswer)
      newanswer._key = meta._key
      return newanswer
    },

    async getOneAnswer (_key) {
      const answer = await collection.document(_key)
      return answer
    },

    // udpates an answer, we assume the _key is the correct one
    async replaceAnswer (_key, answer) {
      const meta = await collection.replace(_key, answer)
      answer._key = meta._key
      return answer
    },

    // udpates an answer, we assume the _key is the correct one
    async updateAnswer (_key, answer) {
      const newval = await collection.update(_key, answer, { keepNull: false, mergeObjects: true, returnNew: true })
      return newval
    },

    // deletes an answer
    async deleteAnswer (_key) {
      await collection.remove(_key)
      return true
    },

    // deletes all data based on study
    async deleteAnswersByStudy (studyKey) {
      const answers = await this.getMiband3DataByStudy(studyKey)
      for (let i = 0; i < answers.length; i++) {
        await this.deleteAnswer(answers[i]._key)
      }
    },

    // deletes all data based on user key
    async deleteAnswersByUser (userKey) {
      const answers = await this.getAnswersDataByUser(userKey)
      for (let i = 0; i < answers.length; i++) {
        await this.deleteAnswer(answers[i]._key)
      }
    }
  }
}
