'use strict'

/**
* This zips data collected in a study.
*/
import fs from 'fs'
import archiver from 'archiver'
import { applogger } from './logger.mjs'
import { DAO } from '../DAO/DAO.mjs'


export default {

    tempFolderPath: 'tmp/',

    async purgeOldFiles (timeoutSecs) {
        let filenames = await fs.promises.readdir(this.tempFolderPath)
        let timeAgo = new Date(new Date().getTime() - (timeoutSecs * 60 * 60 * 24 * 7))

        for (let filename of filenames) {
            let stat = await fs.promises.stat(this.tempFolderPath + filename)
            if (timeoutSecs == -1 || stat.birthtime < timeAgo) {
                await fs.promises.unlink(this.tempFolderPath + filename)
            }
        }
    },

    async zipStudyData (studyKey) {
        return new Promise(async (resolve, reject) => {
            let finished = false
            let filename = (Math.floor((Math.random() * 999999)) + '').padStart(6, '0') + '_' + studyKey + '.zip'
            applogger.info('Creating zip file for study ' + studyKey + ', filename: ' + filename)

            const output = fs.createWriteStream(this.tempFolderPath + filename)
            const archive = archiver('zip', {
                zlib: { level: 9 } // compression level
            })
            output.on('end', function () {
                if (!finished) resolve(filename)
                finished = true
            })
            output.on('finish', function () {
                if (!finished) resolve(filename)
                finished = true
            })
            output.on('close', function () {
                if (!finished) resolve(filename)
                finished = true
            })

            archive.pipe(output)

            archive.on('warning', function (err) {
                console.warn(err)
                applogger.warn(err, 'Warning while creating zip file for study ' + studyKey)
            })

            // catch error explicitly
            archive.on('error', function (err) {
                reject(err)
            })

            // participants
            DAO.getParticipantsByStudy(studyKey, null, (p) => {
                archive.append(JSON.stringify(p), { name: 'participants/' + p._key + '.json' });
            }).then(() => {
                // answers
                DAO.getAnswersByStudy(studyKey, (a) => {
                    archive.append(JSON.stringify(a), { name: 'answers/' + a._key + '.json' });
                })
            }).then(() => {
                // TODO:
                // healthstore, miband, po60, qcst, smwt
                return archive.finalize()
            }).catch((err) => {
                reject(err)
            })
        })
    }
}