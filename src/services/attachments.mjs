// helps saving files for a study and task
import { open as fsOpen, lstat as fsStat, mkdir as fsMkdir, readdir as fsReaddir, rmdir as fsRmdir } from 'fs/promises'
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
  const studyPath = UPLOADSDIR + '/' + studyKey + '/'
  let stat
  // gracefully return if no directory is found
  try {
    await fsStat(studyPath)
  } catch (err) {
    return
  }

  const usersDirs = await fsReaddir(studyPath)
  for (const userDir of usersDirs) {
    const userPath = studyPath + userDir + '/'
    try {
      await fsStat(userPath)
    } catch (err) {
      return
    }
    const tasksDirs = await fsReaddir(userPath)
    for (const taskDir of tasksDirs) {
      const taskPath = userPath + taskDir + '/'
      try {
        await fsStat(taskPath)
      } catch (err) {
        return
      }
      const tasksDirs = await fsReaddir(taskPath)
      for (const file of tasksDirs) {
        const filePath = taskPath + file
        const stat = await fsStat(filePath)
        if (!stat.isDirectory()) {
          let filehandle
          try {
            filehandle = await fsOpen(filePath)
            // TODO: use a read stream when migrating to node > 16
            // const readStream = await filehandle.createReadStream()
            const content = await filehandle.readFile()
            cbk({
              study: studyKey,
              task: taskDir,
              user: userDir,
              file: file,
              content: content
              // readStream: readStream
            })
          } finally {
            if (filehandle) await filehandle.close()
          }
        }
      }
    }
  }
}

export async function deleteAttachmentsByStudy (studyKey) {
  const studyDir = UPLOADSDIR + '/' + studyKey
  // gracefully return if no directory is found
  try {
    await fsStat(studyDir)
  } catch (err) {
    return
  }
  return fsRmdir(studyDir, { recursive: true })
}

export async function deleteAttachmentsByUser (userKey) {
  const studiesDirs = await fsReaddir(UPLOADSDIR + '/')
  let stat
  for (const studyDir of studiesDirs) {
    try {
      stat = await fsStat(UPLOADSDIR + '/' + studyDir)
    } catch (err) {
      return
    }

    if (stat.isDirectory()) {
      const usersDirs = await fsReaddir(UPLOADSDIR + '/' + studyDir + '/')
      for (const userDir of usersDirs) {
        try {
          stat = await fsStat(UPLOADSDIR + '/' + studyDir + '/' + userDir)
        } catch (err) {
          return
        }
        if (stat.isDirectory()) {
          if (userDir == userKey) {
            await fsRmdir(UPLOADSDIR + '/' + studyDir + '/' + userDir + '/', { recursive: true })
          }
        }
      }
    }
  }
}
