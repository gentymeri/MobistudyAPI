'use strict'

/**
* Mobistudy REST API. This is the main application file.
* This loads the actual application and initalises the environment.
*/
import fs from 'fs'
import http from 'http'
import https from 'https'
import cluster from 'cluster'
import os from 'os'
import getConfig from './services/config.mjs'
import getApp from './app.mjs'

(async () => {
  const numCPUs = os.cpus().length
  const app = await getApp()

  var config = getConfig()

  // pass parameters down the application
  app.set('port', config.web.port)

  if (config.web.cluster && cluster.isMaster) {
    console.log(`Master process ${process.pid} is running`)

    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork()
    }

    cluster.on('exit', (worker, code, signal) => {
      console.log(`worker ${worker.process.pid} died`)
    })
  } else {
    var server

    if (config.cert) {
      // HTTPS case

      // Private Key and Public Certificate
      var privateKey = fs.readFileSync(config.cert.key, 'utf8')
      var certificate = fs.readFileSync(config.cert.file, 'utf8')

      server = https.createServer({ key: privateKey, cert: certificate }, app)
    } else {
      // HTTP case
      server = http.createServer(app)
    }

    // Listen on provided port, on all network interfaces.
    server.listen(config.web.port)
    server.on('error', onError)
    server.on('listening', onListening)

    console.log(`Listening process ${process.pid} started`)
  }

  /**
  * Event listener for HTTP server "error" event.
  */
  function onError (error) {
    if (error.syscall !== 'listen') {
      throw error
    }

    var bind = typeof config.web.port === 'string' ? 'Pipe ' + config.web.port : 'Port ' + config.web.port

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(bind + ' requires elevated privileges')
        process.exit(1)
      case 'EADDRINUSE':
        console.error(bind + ' is already in use')
        process.exit(1)
      default:
        throw error
    }
  }

  /**
  * Event listener for HTTP server "listening" event.
  */
  function onListening () {
    var addr = server.address()
    var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port
    console.log('Listening on ' + bind)
  }
})()
