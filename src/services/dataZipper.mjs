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

  /**
   * Purges old zip files
   * @param timeoutSecs files older than this value, in secs, are purged
   */
  async purgeOldFiles (timeoutSecs) {
    const filenames = await fs.promises.readdir(this.tempFolderPath)
    const timeAgo = new Date(new Date().getTime() - (timeoutSecs * 60 * 60 * 24 * 7))

    for (const filename of filenames) {
      if (filename.endsWith('.zip')) {
        const stat = await fs.promises.stat(this.tempFolderPath + filename)
        if (timeoutSecs === -1 || stat.birthtime < timeAgo) {
          await fs.promises.unlink(this.tempFolderPath + filename)
        }
      }
    }
  },

  /**
   * Creates a zip file with the data of a study
   * @param studyKey the study key
   * @returns a promise
   */
  async zipStudyData (studyKey) {
    return new Promise((resolve, reject) => {
      let finished = false
      const filename = (Math.floor((Math.random() * 999999)) + '').padStart(6, '0') + '_' + studyKey + '.zip'
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
        // console.warn(err)
        applogger.warn(err, 'Warning while creating zip file for study ' + studyKey)
      })

      // catch error explicitly
      archive.on('error', function (err) {
        reject(err)
      })

      // participants
      DAO.getParticipantsByStudy(studyKey, null, (p) => {
        archive.append(JSON.stringify(p), { name: 'participants/' + p._key + '.json' })
      }).then(() => {
        // answers
        DAO.getAnswersByStudy(studyKey, (a) => {
          archive.append(JSON.stringify(a), { name: 'answers/' + a._key + '.json' })
        })
      }).then(() => {
        // healthstore
        DAO.getHealthStoreDataByStudy(studyKey, (a) => {
          archive.append(JSON.stringify(a), { name: 'healthstore/' + a._key + '.json' })
        })
      }).then(() => {
        // miband
        DAO.getMiband3DataByStudy(studyKey, (a) => {
          archive.append(JSON.stringify(a), { name: 'miband3/' + a._key + '.json' })
        })
      }).then(() => {
        // po60
        DAO.getPO60DataByStudy(studyKey, (a) => {
          archive.append(JSON.stringify(a), { name: 'po60/' + a._key + '.json' })
        })
      }).then(() => {
        // qcst
        DAO.getQCSTDataByStudy(studyKey, (a) => {
          archive.append(JSON.stringify(a), { name: 'qcst/' + a._key + '.json' })
        })
      }).then(() => {
        // smwt
        DAO.getSMWTDataByStudy(studyKey, (a) => {
          archive.append(JSON.stringify(a), { name: 'smwt/' + a._key + '.json' })
        })
      }).then(() => {
        // peakflow
        DAO.getPeakFlowsByStudy(studyKey, (a) => {
          archive.append(JSON.stringify(a), { name: 'peakflow/' + a._key + '.json' })
        })
      }).then(() => {
        // position
        DAO.getPositionsByStudy(studyKey, (a) => {
          archive.append(JSON.stringify(a), { name: 'position/' + a._key + '.json' })
        })
      }).then(() => {
        // fingerTapping
        DAO.getFingerTappingsByStudy(studyKey, (a) => {
          archive.append(JSON.stringify(a), { name: 'fingerTapping/' + a._key + '.json' })
        })
      }).then(() => {
        return archive.finalize()
      }).catch((err) => {
        reject(err)
      })
    })
  }
}
