'use strict'

/**
 * This provides the data access for the Study TappingData.
 */

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

export default async function (db) {
    let collection = await utils.getCollection(db, 'tappingData')

    return {
        async getAlltappingData () {
            let filter = ''
            let query = 'FOR data IN tappingData ' + filter + ' RETURN data'
            applogger.trace('Querying "' + query + '"')
            let cursor = await db.query(query)
            return cursor.all()
        },

        async gettappingDataByUser (userKey) {
            var query = 'FOR data IN tappingData FILTER data.userKey == @userKey RETURN data'
            let bindings = { userKey: userKey }
            applogger.trace(bindings, 'Querying "' + query + '"')
            let cursor = await db.query(query, bindings)
            return cursor.all()
        },

        async gettappingDataByUserAndStudy (userKey, studyKey) {
            var query = 'FOR data IN tappingData FILTER data.userKey == @userKey AND data.studyKey == @studyKey RETURN data'
            let bindings = { userKey: userKey, studyKey: studyKey }
            applogger.trace(bindings, 'Querying "' + query + '"')
            let cursor = await db.query(query, bindings)
            return cursor.all()
        },

        async gettappingDataByStudy (studyKey) {
            var query = 'FOR data IN tappingData FILTER data.studyKey == @studyKey RETURN data'
            let bindings = { studyKey: studyKey }
            applogger.trace(bindings, 'Querying "' + query + '"')
            let cursor = await db.query(query, bindings)
            return cursor.all()
        },

        async createtappingData (newtappingData) {
            let meta = await collection.save(newtappingData)
            newtappingData._key = meta._key
            return newtappingData
        },

        async getOnetappingData (_key) {
            const tappingData = await collection.document(_key)
            return tappingData
        },

        // deletes tappingData
        async deletetappingData (_key) {
            await collection.remove(_key)
            return true
        },

        // deletes all data based on study
        async deletetappingDataByStudy (studyKey) {
            let tappingData = await this.gettappingDataByStudy(studyKey)
            for (let i = 0; i < tappingData.length; i++) {
                await this.deletetappingData(tappingData[i]._key)
            }
        },

        // deletes all data based on user
        async deletetappingDataByUser (userKey) {
            let tappingData = await this.gettappingDataByUser(userKey)
            for (let i = 0; i < tappingData.length; i++) {
                await this.deletetappingData(tappingData[i]._key)
            }
        }
    }
}