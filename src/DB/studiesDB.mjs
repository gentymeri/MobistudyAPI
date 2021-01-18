'use strict'

/**
* This provides the data access for the study descriptions.
*/
import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

export default async function (db) {
  let collection = await utils.getCollection(db, 'studies')

  return {
    // NEW GET STUDIES FUNCTION
    async getStudies (countOnly, after, before, studyTitle, sortDirection, offset, rowsPerPage) {
      let queryString = ''

      if (countOnly) {
        queryString = `RETURN COUNT ( `
      }
      let bindings = {}
      queryString += `FOR study IN studies `
      if (!countOnly || studyTitle) {
        queryString += ` FOR team IN teams
        FILTER team._key == study.teamKey `
      }
      if (after && before) {
        queryString += `FILTER DATE_DIFF(study.createdTS, @after, 's') <=0 AND DATE_DIFF(study.createdTS, @before, 's') >=0 `
        bindings.after = after
        bindings.before = before
      }
      if (after && !before) {
        queryString += `FILTER DATE_DIFF(study.createdTS, @after, 's') <=0 `
        bindings.after = after
      }
      if (!after && before) {
        queryString += `FILTER DATE_DIFF(study.createdTS, @before, 's') >=0 `
        bindings.before = before
      }
      if (studyTitle) {
        queryString += `FILTER LIKE(study.generalities.title, CONCAT('%', @studyTitle, '%'), true) `
        bindings.studyTitle = studyTitle
      }
      if (!countOnly) {
        if (!sortDirection) {
          sortDirection = 'DESC'
        }
        queryString += `SORT study.generalities.title @sortDirection `
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
          studykey: study._key,
          studytitle: study.generalities.title,
          createdTS: study.createdTS,
          publishedTS: study.publishedTS,
          teamkey: study.teamKey,
          teamname: team.name,
          startDate: study.generalities.startDate,
          endDate: study.generalities.endDate
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
    async getAllStudies () {
      // TODO: use LIMIT @offset, @count in the query for pagination

      var query = 'FOR study in studies RETURN study'
      applogger.trace('Querying "' + query + '"')
      let cursor = await db.query(query)
      return cursor.all()
    },

    async getAllTeamStudies (teamkey) {
      var query = 'FOR study in studies FILTER study.teamKey == @teamkey RETURN study'
      let bindings = { teamkey: teamkey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async getAllParticipantStudies (participantKey) {
      var query = `FOR participant IN participants
      FILTER participant._key == @participantKey
      FOR study IN studies
      FILTER study._key IN participant.studies[*].studyKey
      RETURN study`
      let bindings = { participantKey: participantKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    },

    async createStudy (newstudy) {
      let meta = await collection.save(newstudy)
      newstudy._key = meta._key
      return newstudy
    },

    async getOneStudy (studyKey) {
      var query = `FOR study IN studies FILTER study._key == @studyKey RETURN study`
      let bindings = { studyKey: studyKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      let study = await cursor.next()
      return study
    },

    // udpates a study, we assume the _key is the correct one
    async replaceStudy (_key, study) {
      const meta = await collection.replace(_key, study)
      study._key = meta._key
      return study
    },

    // udpates a study, we assume the _key is the correct one
    async udpateStudy (_key, study) {
      const newval = await collection.update(_key, study, { keepNull: false, mergeObjects: true, returnNew: true })
      return newval
    },

    // deletes a study
    async deleteStudy (_key) {
      await collection.remove(_key)
      return true
    },

    // gets an unused invitation code
    async getNewInvitationCode () {
      let repeat = true
      let invitationCode = undefined
      do {
        // generate a random 6 digits number
        invitationCode = ('' + Math.round(Math.random() * 999999)).padStart(6, '0')
        // check if the number is already used
        var query = `FOR study IN studies FILTER study.invitationCode == @invitationCode RETURN study`
        let bindings = { invitationCode: invitationCode }
        applogger.trace(bindings, 'Querying "' + query + '"')
        let cursor = await db.query(query, bindings)
        let study = await cursor.all()
        if (study.length) repeat = true
        else repeat = false
      } while (repeat)
      applogger.info({invitationCode: invitationCode},'Invitation code generated:')
      return invitationCode + ''
    },
    // Gets the one study that matches the invitation code
    async getInvitationalStudy (invitationCode) {
      const query = `FOR study IN studies FILTER study.invitationCode == @invitationCode RETURN study`
      let bindings = { invitationCode: invitationCode }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      let study = await cursor.next()
      return study
    },

    // gets all the studies that match inclusion criteria
    async getMatchedNewStudies (userKey) {
      // TODO add BMI to query
      const query = `FOR study IN studies
      FILTER !!study.publishedTS
      LET partsN = FIRST (
        RETURN COUNT(
          FOR part IN participants
          FILTER !!part.studies
          FILTER study._key IN part.studies[* FILTER !!CURRENT.acceptedTS].studyKey
          RETURN 1
        )
      )
      FILTER !study.numberOfParticipants || study.numberOfParticipants > partsN
      FOR participant IN participants
      LET age = DATE_DIFF(participant.dateOfBirth, DATE_NOW(), "year")
      FILTER participant.userKey == @userKey
      AND study._key NOT IN participant.studies[*].studyKey
      AND participant.language IN study.generalities.languages[*]
      AND participant.country IN study.inclusionCriteria.countries[*]
      AND age >= study.inclusionCriteria.minAge AND age <= study.inclusionCriteria.maxAge
      AND participant.sex IN study.inclusionCriteria.sex
      AND participant.studiesSuggestions == TRUE
      AND study.inclusionCriteria.diseases[*].conceptId ALL IN participant.diseases[*].conceptId
      AND study.inclusionCriteria.medications[*].conceptId ALL IN participant.medications[*].conceptId
      AND study.invitational == FALSE
      RETURN study._key`

      let bindings = { userKey: userKey }
      applogger.trace(bindings, 'Querying "' + query + '"')
      let cursor = await db.query(query, bindings)
      return cursor.all()
    }
  }
}
