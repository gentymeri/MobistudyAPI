'use strict'

/**
* This provides the data access for users.
* A use will have basic authentication and data access information:
* {
*   email: 'aas@as.com',
*   hashedPassword: 'asdasdasdasdads',
*   role: 'participant', (or 'admin', 'researcher')
* }
*/

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

export default async function (db) {
  const usersCollection = await utils.getCollection(db, 'users')

  return {
    async findUser (email) {
      // Email string is set to lowercase
      const query = 'FOR user in users FILTER LOWER(user.email) == \'' + email + '\' RETURN user'
      applogger.trace('Querying "' + query + '"')
      const cursor = await db.query(query)
      const users = await cursor.all()
      if (users.length) return users[0]
      else return undefined
    },

    async createUser (newuser) {
      const meta = await usersCollection.save(newuser)
      newuser._key = meta._key
      return newuser
    },

    async getOneUser (userkey) {
      const user = await usersCollection.document(userkey)
      applogger.trace('Searching for user "' + user._key)
      return user
    },
    // NEW GET USER FUNCTION
    async getUsers (countOnly, roleType, userEmail, sortDirection, offset, rowsPerPage) {
      let queryString = ''

      if (countOnly) {
        queryString = 'RETURN COUNT ( '
      }
      const bindings = {}
      queryString += 'FOR user IN users '

      if (roleType) {
        queryString += 'FILTER user.role == @roleType '
        bindings.roleType = roleType
      }
      if (userEmail) {
        queryString += 'FILTER LIKE(user.email, CONCAT(\'%\', @userEmail, \'%\'), true) '
        bindings.userEmail = userEmail
      }
      if (!countOnly) {
        if (!sortDirection) {
          sortDirection = 'DESC'
        }
        queryString += 'SORT user.email @sortDirection '
        bindings.sortDirection = sortDirection
        if (!!offset && !!rowsPerPage) {
          queryString += 'LIMIT @offset, @rowsPerPage '
          bindings.offset = parseInt(offset)
          bindings.rowsPerPage = parseInt(rowsPerPage)
        }
      }

      if (countOnly) {
        queryString += ' RETURN 1 )'
      } else {
        queryString += ` RETURN {
          userkey: user._key,
          email: user.email,
          role: user.role
        }`
      }
      applogger.trace(bindings, 'Querying "' + queryString + '"')
      const cursor = await db.query(queryString, bindings)
      if (countOnly) {
        const counts = await cursor.all()
        if (counts.length) return '' + counts[0]
        else return undefined
      } else return cursor.all()
    },

    // get all users given a role and a list of studies
    async getAllUsersByCriteria (role, studyKeys, dataCallback) {
      let join = ''
      let filter = ''
      const bindings = {}
      if (role === 'participant') {
        filter = ' FILTER user.role == "participant" '

        if (studyKeys) {
          join = ' FOR participant in participants '
          filter += ' FILTER participant.userKey == user._key AND LENGTH( INTERSECTION (participant.studies[*].studyKey, @studyKeys) ) > 0   '
          bindings.studyKeys = studyKeys
        }
      } else if (role === 'researcher') {
        filter = ' FILTER user.role == "researcher" '

        if (studyKeys) {
          join = ' FOR team in teams FOR study in studies '
          filter += ' FILTER user._key IN team.researchersKeys AND  study.teamKey == team._key AND study._key IN ["4590699"]  '
          bindings.studyKeys = studyKeys
        }
      } else if (role === 'admin') {
        filter = ' FILTER user.role == "admin" '
      } else {
        throw new Error('Role must be specified')
      }

      const query = 'FOR user in users ' + join + filter + ' RETURN { _key: user._key, email: user.email, role: user.role }'
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      if (dataCallback) {
        while (cursor.hasNext) {
          const p = await cursor.next()
          dataCallback(p)
        }
      } else return cursor.all()
    },

    // Get all users in DB
    async getAllUsersInDb () {
      const query = 'FOR user in users RETURN user'
      applogger.trace('Querying "' + query + '"')
      const cursor = await db.query(query)
      return cursor.all()
    },

    // udpates a user, we assume the _key is the correct one
    async updateUser (_key, newuser) {
      const newval = await usersCollection.update(_key, newuser, { keepNull: false, mergeObjects: true, returnNew: true })
      return newval
    },

    // remove a user (Assumption: userKey is the correct one)
    async removeUser (userKey) {
      const bindings = { usrKey: userKey }
      const query = 'REMOVE { _key:@usrKey } IN users'
      applogger.trace(bindings, 'Querying "' + query + '"')
      const cursor = await db.query(query, bindings)
      return cursor.all()
    }
  }
}
