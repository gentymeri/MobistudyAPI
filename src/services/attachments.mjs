// helps saving files for a study and task
import { open as fsOpen, lstat as fsStat, mkdir as fsMkdir, readdir as fsReaddir } from 'fs/promises'
import { applogger } from '../services/logger.mjs'

const UPLOADSDIR = 'tasksuploads'

export async function saveAttachment (userKey, studyKey, taskId, fileName) {
  // create the study folder
  const studyDir = UPLOADSDIR + '/' + studyKey
  try {
    await fsStat(studyDir)
  } catch (err) {
    await fsMkdir(studyDir, { recursive: true })
  }

  // create the user folder
  const userDir = studyDir + '/' + userKey
  try {
    await fsStat(userDir)
  } catch (err) {
    await fsMkdir(userDir, { recursive: true })
  }

  // create the task folder
  const taskDir = userDir + '/' + taskId
  try {
    await fsStat(taskDir)
  } catch (err) {
    await fsMkdir(taskDir, { recursive: true })
  }

  // save the file
  let filehandle, filePath
  const writer = {}
  try {
    filePath = taskDir + '/' + fileName
    filehandle = await fsOpen(filePath, 'w')
  } catch (err) {
    if (filehandle) await filehandle.close()
    throw err
  }
  writer.writeChunk = async (chunk) => {
    await filehandle.writeFile(chunk)
  }
  writer.end = async () => {
    applogger.debug('Attachment file saved for user ' + userKey + ' study ' + studyKey + ' task ' + taskId + ' at ' + filePath)
    if (filehandle) await filehandle.close()
  }
  return writer
}

export async function getAttachments (studyKey, cbk) {
  if (!cbk) throw new Error('Callback must be specified')
  const studyDir = UPLOADSDIR + '/' + studyKey
  let stat
  // gracefully return if no directory is found
  try {
    stat = await fsStat(studyDir)
  } catch (err) {
    return
  }

  const usersDirs = await fsReaddir(studyDir)
  for (const userDir of usersDirs) {
    try {
      stat = await fsStat(studyDir + '/' + userDir)
    } catch (err) {
      return
    }

    if (stat.isDirectory()) {
      const userKey = userDir
      try {
        stat = await fsStat(studyDir + '/' + userDir + '/')
      } catch (err) {
        return
      }
      if (stat.isDirectory()) {
        const tasksDirs = await fsReaddir(studyDir + '/' + userDir + '/')
        for (const taskDir of tasksDirs) {
          const taskId = taskDir
          const taskPath = studyDir + '/' + userDir + '/' + taskId + '/'
          try {
            stat = await fsStat(taskPath)
          } catch (err) {
            return
          }
          if (stat.isDirectory()) {
            const tasksDirs = await fsReaddir(taskPath)
            for (const file of tasksDirs) {
              let filehandle
              try {
                filehandle = await fsOpen(taskPath + file)
                // TODO: use a read stream when migrating to node > 16
                // const readStream = await filehandle.createReadStream()
                const content = await filehandle.readFile()
                cbk({
                  study: studyKey,
                  task: taskId,
                  user: userKey,
                  file: file,
                  content: content
                  // readStream: readStream
                })
              } finally {
                if (filehandle) await filehandle.close()
              }
            }
          } else {
            throw new Error('File, no user-related directory in study ' + studyKey + ', user ' + userDir, ', task ' + taskId)
          }
        }
      } else {
        throw new Error('File, no user-related directory in study ' + studyKey + ', user ' + userDir)
      }
    } else {
      throw new Error('File, no user-related directory in study ' + studyKey)
    }
  }
}
