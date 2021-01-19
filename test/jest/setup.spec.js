const {Docker} = require('node-docker-api')
const fs = require('fs')
const axios = require('axios')

const ARANGOPORT = '5555'

const pullImage = function (docker, image, tag) {
  return new Promise((resolve, reject) => {
    docker.image.create({}, { fromImage: image, tag: tag })
    .then((stream) => {
      stream.on('data', (d) => {
        fs.appendFile('test_log.txt', d.toString(), 'utf8',
        function(err) {
          if (err) console.error(err)
        })
      })
      stream.on('end', resolve)
      stream.on('error', reject)
    })
  })
}

const wait = function (millis) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, millis)
  })
}

describe('when testing jest alone', () => {
  test('a simple test runs', () => {
    expect(1 + 2).toBe(3)
  })
})

describe('when having arango pulled', () => {
  let docker
  let image
  let container

  beforeAll(async () => {
    docker = new Docker({ socketPath: '/var/run/docker.sock' })
    await pullImage(docker, 'arangodb', '3.6')
    image = await docker.image.get('arangodb:3.6').status()
    return
  }, 60000)

  afterAll(async () => {
    if (container) await container.delete({ force: true })
    // uncomment this to remove the image from the computer
    // if (image) await image.remove()
    return
  })

  test('we can start and stop the container', async () => {
    console.log('creating container')
    container = await docker.container.create({
      Image: 'arangodb:3.6',
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
        },
      }
    })
    console.log('starting container')
    container = await container.start()

    console.log('container started')

    // let started = false
    // while (!started) {
    //   try {
    //     let resp = await axios.get('http://localhost:8529/_db/_system/', {
    //       auth: {
    //         username: 'root',
    //         password: 'testtest'
    //       }
    //     })
    //     console.log('connected to Arango!!!')
    //     started = true
    //   } catch (err) {
    //     console.log('waiting for DB to wake up')
    //   }
    // }

    // for some unknown reason, arangosh manages to access the DB only after some
    // seconds, even if the DB is up and running
    await wait(10000)

    console.log('executing command')

    let creationscript = "db._createDatabase('mobistudy');\
    var users = require('@arangodb/users');\
    users.save('mobistudy', 'testpwd');\
    users.grantDatabase('mobistudy', 'mobistudy');"

    let exec = await container.exec.create({
      Cmd: [ 'arangosh',
      'server.endpoint', 'http+tcp://127.0.0.1:' + ARANGOPORT,
      '--server.username', 'root' ,
      '--server.password', 'testtest',
      '--javascript.execute-string', creationscript ],
      AttachStderr: true,
      AttachStdout: true
    })
    const execStart = async function (exec) {
      return new Promise((resolve, reject) => {
        exec.start()
        .then((stream) => {
          stream.on('data', (info) => {
            console.log('got some data, command executed')
            console.log(info.toString())
            if (info.toString().includes('ERROR')) reject(info.toString())
            else resolve()
          })
          stream.on('end', resolve)
          stream.on('error', reject)
        })
      })
    }

    await execStart(exec)

    console.log('stopping')
    await container.stop()
    return
  }, 60000)
})
