'use strict'

/**
* This zips data collected in a study.
*/
import { promises as fs } from 'fs'
import { archiver } from 'archiver'
import { applogger } from 'logger.mjs'

const PATH = 'studyzipfiles/'

export default {

    async purgeOldFiles () {
        let files = fs.readdir(PATH)
        let weekAgo = new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 7)

        for (const filename of files) {
            let stat = await file.stat(PATH + filename)

            if (stat.birthtime < weekAgo) {
                fs.unlink(PATH + filename)
            }
        }
    },

    async zipStudyData (db, studyKey) {
        return new Promise(async (resolve, reject) => {
            applogger.info('Creating zip file for study ' + studyKey)

            const output = fs.createWriteStream(PATH + studyKey + '.zip')
            const archive = archiver('zip', {
                zlib: { level: 9 } // compression level
            })
            output.on('close', function () {
                console.log(archive.pointer() + ' total bytes')
                resolve()
            })

            archive.on('warning', function (err) {
                applogger.warn(err, 'Warning while creating zip file for study ' + studyKey)
            })

            // good practice to catch this error explicitly
            archive.on('error', function (err) {
                reject(err)
            })

            // participants
            await db.getParticipantsByStudyForZipper(studyKey, (p) => {
                archive.append(JSON.stringify(p), { name: 'participants/' + p._key + '.json' });
            })

            // answers
            await db.getAnswersByStudyForZipper(studyKey, (a) => {
                archive.append(JSON.stringify(a), { name: 'answers/' + a._key + '.json' });
            })

            // TODO:
            // healthstore, miband, po60, qcst, smwt

            archive.finalize()
        })
    }
}