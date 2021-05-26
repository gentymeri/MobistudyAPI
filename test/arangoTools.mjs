import Docker from 'node-docker-api'
import Arango from 'arangojs'

let docker = new Docker.Docker({ socketPath: '/var/run/docker.sock' })
let image
let container
let db

const pullImage = function (docker, image, tag) {
  docker.image.create({}, { fromImage: image, tag: tag })
    .then((stream) => {
      return promisifyStream(stream)
    })
}

const promisifyStream = stream => new Promise((resolve, reject) => {
  stream.on('data', data => console.log(data.toString()))
  stream.on('end', resolve)
  stream.on('error', reject)
})

const wait = async function (millis) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, millis)
  })
}

const ARANGO_VERSION = '3.7'

export const ARANGOPORT = '5555'

export const pullArango = async function () {
  console.log('pulling image...')
  image = await pullImage(docker, 'arangodb', ARANGO_VERSION)
  console.log('...image pulled')
}


export const getArangoImage = async function () {
  return docker.image.get('arangodb:' + ARANGO_VERSION)
}

export const getArangoContainer = async function () {
  let containers = await docker.container.list()
  for (const c of containers) {
    if (c.data.Names.includes('/arangodb_tests')) {
      container = c
      return c
    }
  }
  return undefined
}

export const createArangoContainer = async function () {
  container = await docker.container.create({
    Image: 'arangodb:3.7',
    name: 'arangodb_tests',
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
  console.log('container created')
}

export const startArangoContainer = async function () {
  container = await container.start()
  // some wait time is needed before connections are allowed
  await wait(5000)
  console.log('container started')
  return container
}

export const connectToDatabase = async function (dbname) {
  db = new Arango({
    url: 'http://localhost:' + ARANGOPORT,
    precaptureStackTraces: true,
    auth: { username: 'root', password: 'testtest' },
  })
  const names = await db.listUserDatabases()
  if (!names.includes(dbname)) {
    await db.createDatabase(dbname, {
      users: [{ username: 'mobistudy', passwd: 'testpwd' }]
    })
  }

  db.useDatabase(dbname)
  db.useBasicAuth('mobistudy', 'testpwd')

  console.log('connected to mobistudy db')
}

export const dropDatabase = async function (dbname) {
  db.useDatabase('_system')
  db.useBasicAuth('root', 'testtest')
  await db.dropDatabase(dbname)
}

export const stopArangoContainer = async function () {
  await container.stop()
  await container.delete({ force: true })
  // if (image) await image.remove()
  return
}

export const getCollection = async function (collname) {
  // load or create collection
  let names = await db.listCollections()

  for (var ii = 0; ii < names.length; ii++) {
    if (names[ii].name === collname) {
      return db.collection(collname)
    }
  }
  return db.createCollection(collname)
}

export const addDataToCollection = async function (collname, data) {
  let collection = await getCollection(collname)
  let meta = await collection.save(data)
  return meta._key
}

export const removeFromCollection = async function (collname, key) {
  let collection = await getCollection(collname)
  return collection.remove(key)
}

export { db as DB }
