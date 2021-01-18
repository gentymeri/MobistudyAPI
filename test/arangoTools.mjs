import Docker from 'node-docker-api'
import Arango from 'arangojs'
import utils from '../src/DB/utils.mjs'

let docker = new Docker.Docker({ socketPath: '/var/run/docker.sock' })
let container
let db

const pullImage = function (docker, image, tag) {
  return new Promise((resolve, reject) => {
    docker.image.create({}, { fromImage: image, tag: tag })
      .then((stream) => {
        stream.on('end', resolve)
        stream.on('error', reject)
      })
  })
}

const wait = async function (millis) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, millis)
  })
}

const execStart = async function (exec) {
  return new Promise((resolve, reject) => {
    exec.start()
      .then((stream) => {
        stream.on('data', (info) => {
          if (info.toString().includes('ERROR')) reject(info.toString())
          else resolve()
        })
        stream.on('end', resolve)
        stream.on('error', reject)
      })
  })
}

const ARANGO_VERSION = '3.7'

export const ARANGOPORT = '5555'

export const pullArango = async function () {
  console.log('pulling image...')
  await pullImage(docker, 'arangodb', ARANGO_VERSION)
  console.log('...image pulled')
}

export const getArangoImage = async function () {
  return docker.image.get('arangodb:' + ARANGO_VERSION)
}

export const getArangoContainer = async function () {
  let containers = await docker.container.list()
  for (const c of containers) {
    if (c.data.Names.includes('/arangodb')) {
      container = c
      return c
    }
  }
  return undefined
}

export const createArangoContainer = async function () {
  console.log('creating container')
  container = await docker.container.create({
    Image: 'arangodb:3.7',
    name: 'arangodb',
    Env: [
      'ARANGO_ROOT_PASSWORD=testtest'
    ],
    HostConfig: {
      PortBindings: {
        "8529/tcp": [
          {
            HostPort: ARANGOPORT
          }
        ]
      }
    }
  })
}

export const startArangoContainer = async function () {
  console.log('starting container')
  container = await container.start()
  console.log('container started')
  return container
}

export const initArangoContainer = async function () {
  await wait(10000)

  console.log('executing init script')

  let creationscript = "db._createDatabase('mobistudy');\
  var users = require('@arangodb/users');\
  users.save('mobistudy', 'testpwd');\
  users.grantDatabase('mobistudy', 'mobistudy');"

  let exec = await container.exec.create({
    Cmd: ['arangosh', '--server.username', 'root', '--server.password', 'testtest', '--javascript.execute-string', creationscript],
    AttachStderr: true,
    AttachStdout: true
  })

  await execStart(exec)
  console.log('mobistudy db created')

  db = new Arango({ url: 'http://localhost:' + ARANGOPORT })

  db.useDatabase('mobistudy')
  db.useBasicAuth('mobistudy', 'testpwd')
}

export const stopArangoContainer = async function () {
  await container.stop()
  await container.delete({ force: true })
  // if (image) await image.remove()
  return
}

export const addDataToCollection = async function (collname, data) {
  let collection = await utils.getCollection(db, collname)
  let meta = await collection.save(data)
  data._key = meta._key
  return data
}

export { db as DB }
