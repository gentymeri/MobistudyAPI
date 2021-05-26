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
  let usersCollection = await utils.getCollection(db, 'users')

  return {
    async findUser (email) {
      // Email string is set to lowercase
      var query = 'FOR user in users FILTER LOWER(user.email) == \'' + email + '\' RETURN user'
      applogger.trace('Querying "' + query + '"')
      let cursor = await db.query(query)
      let users = await cursor.all()
      if (users.length) return users[0]
      else return undefined
    },

    async createUser (newuser) {
      let meta = await usersCollection.save(newuser)
      newuser._key = meta._key
      return newuser
    },

    async getOneUser (userkey) {
      let user = await usersCollection.document(userkey)
      applogger.trace('Searching for user "' + user._key)
      return user
    },
    // NEW GET USER FUNCTION
    async getUsers (countOnly, roleType, userEmail, sortDirection, offset, rowsPerPage) {
      let queryString = ''

      if (countOnly) {
        queryString = `RETURN COUNT ( `
      }
      let bindings = {}
      queryString += `FOR user IN users `

      if (roleType) {
        queryString += `FILTER user.role == @roleType `
        bindings.roleType = roleType
      }
      if (userEmail) {
        queryString += `FILTER LIKE(user.email, CONCAT('%', @userEmail, '%'), true) `
        bindings.userEmail = userEmail
      }
      if (!countOnly) {
        if (!sortDirection) {
          sortDirection = 'DESC'
        }
        queryString += `SORT user.email @sortDirection `
        bindings.sortDirection = sortDirection
        if (!!offset && !!rowsPerPage) {
          queryString += `LIMIT @offset, @rowsPerPage `
          bindings.offset = parseInt(offset)
          bindings.rowsPerPage = parseInt(rowsPerPage)
        }
      }

      if (countOnly) {
        queryString += ` RETURN 1 )`
      } else {
        queryString += ` RETURN {
          userkey: user._key,
          email: user.email,
          role: user.role
        }`
      }
      applogger.trace(bindings, 'Querying "' + queryString + '"')
      let cursor = await db.query(queryString, bindings)
      if (countOnly) {
        let counts = await cursor.all()
        if (counts.length) return '' + counts[0]
        else return undefined
      } else return cursor.all()
    },
    async getAllUsersByCriteria (role, studyKey, studyKeys) {
      let join = ''
      let filter = ''
      let bindings = {}
      if (studyKey) {
        join = ' FOR study in studies '
        filter = ' FILTER studies._key == @studyKey '
        bindings.studyKey = studyKey
      }
      if (studyKeys) {
        join = ' FOR study in studies '
        filter = ' FILTER studies._key IN @studyKey '
        bindings.studyKeys = studyKeys
      }
      if (role) {
        if (studyKey) filter += ' AND user.role == @role'
        else filter = ' FILTER user.role == @role'
        bindings.role = role
      }

      var query = 'FOR user in users ' + join + filter + ' RETURN user'
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    // Get all users in DB
    async getAllUsersInDb () {
      var query = 'FOR user in users RETURN user'
      applogger.trace('Querying "' + query + '"')
      let cursor = await db.query(query)
      return cursor.all()
    },

    // udpates a user, we assume the _key is the correct one
    async updateUser (_key, newuser) {
      let newval = await usersCollection.update(_key, newuser, { keepNull: false, mergeObjects: true, returnNew: true })
      return newval
    },

    //remove a user (Assumption: userKey is the correct one)
    async removeUser (userKey) {
      let bindings = { 'usrKey': userKey }
      let query = 'REMOVE { _key:@usrKey } IN users'
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    }
  }
}
