'use strict'

/**
* This provides the data access for the Study participants.
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

export default async function (db) {
  const collection = await utils.getCollection(db, 'participants')

  return {
    async getAllParticipants () {
      const filter = ''
      // TODO: use LIMIT @offset, @count in the query for pagination

      const query = 'FOR participant in participants ' + filter + ' RETURN participant'
      applogger.trace('Querying "' + query + '"')
      const cursor = await db.query(query)
      return cursor.all()
    },

    async createParticipant (newparticipant) {
      const meta = await collection.save(newparticipant)
      newparticipant._key = meta._key
      return newparticipant
    },

    async getOneParticipant (_key) {
      const participant = await collection.document(_key)
      return participant
    },

    async getParticipantByUserKey (userKey) {
      if (!userKey) {
        throw new Error('user key must be specified')
      }
      const bindings = { userkey: userKey }
      const query = 'FOR participant IN participants FILTER participant.userKey == @userkey RETURN participant'
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      const parts = await cursor.all()
      if (parts.length === 0) return undefined
      else return parts[0]
    },

    // currentStatus is optional
    async getParticipantsByStudy (studykey, currentStatus, dataCallback) {
      const bindings = { studyKey: studykey }

      let query = 'FOR participant IN participants '
      query += ' FILTER @studyKey IN participant.studies[*].studyKey '
      if (currentStatus) {
        bindings.currentStatus = currentStatus
        query += ' AND @currentStatus IN participant.studies[*].currentStatus  '
      }
      query += `LET filteredStudies = participant.studies[* FILTER CURRENT.studyKey == @studyKey]
      LET retval = UNSET(participant, 'studies')`
      query += ' RETURN MERGE_RECURSIVE(retval, { studies: filteredStudies })'
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      if (dataCallback) {
        while (cursor.hasNext) {
          const p = await cursor.next()
          dataCallback(p)
        }
      } else return cursor.all()
    },

    async getParticipantsByResearcher (researcherKey, currentStatus) {
      const bindings = { researcherKey: researcherKey }
      let query = `FOR team IN teams
      FILTER @researcherKey IN team.researchersKeys
      FOR study IN studies
      FILTER study.teamKey == team._key
      FOR participant IN participants`
      if (currentStatus) {
        bindings.currentStatus = currentStatus
        query += ' FILTER @currentStatus IN participant.studies[* FILTER CURRENT.studyKey == study._key].currentStatus '
      }
      query += `FILTER study._key IN participant.studies[*].studyKey
      LET filteredStudies = participant.studies[* FILTER CURRENT.studyKey == study._key]
      LET retval = UNSET(participant, 'studies')
      RETURN MERGE_RECURSIVE(retval, { studies: filteredStudies })`
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getParticipantsStatusCountByStudy (studykey) {
      const bindings = { studyKey: studykey }
      const query = `FOR participant IN participants
      FILTER @studyKey IN participant.studies[*].studyKey
      COLLECT statuses = participant.studies[* FILTER CURRENT.studyKey == @studyKey].currentStatus WITH COUNT INTO statuesLen
      RETURN { status: FIRST(statuses), count: statuesLen }`
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getParticipantsByCurrentStatus (currentStatus) {
      const bindings = { currentStatus: currentStatus }
      const query = 'FOR participant IN participants FILTER @currentStatus IN participant.studies[*].currentStatus RETURN participant'
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      return cursor.all()
    },

    // currentStatus is optional
    async getParticipantsByTeam (teamKey, currentStatus) {
      const bindings = { teamKey: teamKey }

      let statusFilter = ''
      if (currentStatus) {
        bindings.currentStatus = currentStatus
        statusFilter += 'AND @currentStatus IN participant.studies[*].currentStatus '
      }

      const query = 'FOR study IN studies FILTER study.teamKey == @teamKey ' +
        'FOR participant IN participants FILTER study._key IN participant.studies[*].studyKey ' +
        statusFilter +
        'RETURN  participant'

      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      return cursor.all()
    },

    // udpates a participant, we assume the _key is the correct one
    async replaceParticipant (_key, participant) {
      const meta = await collection.replace(_key, participant)
      applogger.trace(participant, 'Replacing participant "' + _key + '"')
      participant._key = meta._key
      return participant
    },

    // udpates a participant, we assume the _key is the correct one
    async updateParticipant (_key, participant) {
      const newval = await collection.update(_key, participant, { keepNull: false, mergeObjects: true, returnNew: true })
      applogger.trace(participant, 'Updating participant "' + _key + '"')
      return newval
    },

    // deletes an participant
    async removeParticipant (_key) {
      await collection.remove(_key)
      applogger.trace('Removing participant "' + _key + '"')
      return true
    }
  }
}
