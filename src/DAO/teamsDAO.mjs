'use strict'

/**
* This provides the data access for teams.
* A use will have basic authentication and data access information:
* {
*   name: 'A-Team',
*   createdTS: 'ISO string',
*   invitationCode: 'long JWT valid for all users',
*   invitationExpiry: 'ISO string',
*   researchersKeys: ['asdasdaasd', 'asdasdasd']
* }
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

export default async function (db) {
  let teamsCollection = await utils.getCollection(db, 'teams')

  return {
    async createTeam (newTeam) {
      let meta = await teamsCollection.save(newTeam)
      newTeam._key = meta._key
      return newTeam
    },

    async getOneTeam (key) {
      let bindings = { 'key' : key }
      var query = 'FOR team in teams FILTER team._key == @key RETURN team'
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      let teams = await cursor.all()
      if (teams.length) return teams[0]
      else return undefined
    },

    async findTeam (teamName) {
      let bindings = { 'name': teamName }
      var query = 'FOR team in teams FILTER team.name == @name RETURN team'
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      let teams = await cursor.all()
      if (teams.length) return teams[0]
      else return undefined
    },

    async getAllTeams (userKey, studyKey) {
      let query = 'FOR team in teams '
      let bindings = { }

      if (studyKey) {
        query += 'FOR study IN studies '
        bindings.studyKey = studyKey
        query += 'FILTER study.teamKey == team._key AND study._key == @studyKey '
      }
      if (userKey && !studyKey) {
        query += 'FILTER @userKey IN team.researchersKeys  '
        bindings.userKey = userKey
      }
      if (userKey && studyKey) {
        query += 'AND @userKey IN team.researchersKeys '
        bindings.userKey = userKey
      }

      query += ' RETURN team'
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    // udpates a team (Assumption: _key is the correct one)
    async replaceTeam (_key, team) {
      let meta = await teamsCollection.replace(_key, team)
      team._key = meta._key
      return team
    },

    // remove a team (Assumption: teamKey is the correct one)
    async removeTeam (teamKey) {
      let bindings = { 'tKey' : teamKey}
      let query = 'REMOVE { _key:@tKey } IN teams'
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    }
  }
}
