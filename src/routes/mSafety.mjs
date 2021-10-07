'use strict'
/**
* This provides the API endpoints for the Sony mSafety integration.
*/

import express from 'express'
import { open as fsOpen, stat as fsStat, mkdir as fsMkdir } from 'fs/promises'
import { applogger } from '../services/logger.mjs'
import getConfig from '../services/config.mjs'
import { KeyPair, HandshakeState, CipherState } from '../services/msafetyCrypto.mjs'

const router = express.Router()
const UPLOADSDIR = 'tasksuploads'
const MSAFETYSUBDIR = 'msafety'
const msafetyDir = UPLOADSDIR + '/' + MSAFETYSUBDIR + '/'

const config = getConfig()
const KEYPAIR = new KeyPair(Buffer.from(config.mSafety.publicKey, 'base64'), Buffer.from(config.mSafety.privateKey, 'base64'))

// mem storage for device sessions. For high volume it should be implemented on database instead.
const sessionsStore = {}

/**
 * Stores the content of the CipherStates to the data store.
 *
 * Keeps only keysToSave number of rx keys.
 *
 * @param {String} deviceId a device id.
 * @param {CipherState} rx a CipherState used for incoming messages.
 * @param {CipherState} tx a CipherState used for outgoing messages.
 */
async function storeSession (deviceId, rx, tx) {
  const key = 'state_' + deviceId
  let session = sessionsStore[key]

  if (session) {
    session.tx.key = tx.k.toString('base64')
    session.tx.nonce = tx.n
    session.rx.unshift({ key: rx.k.toString('base64') })

    if (session.rx.length > 3) {
      session.rx.pop()
    }
  } else {
    session = {
      tx: {
        key: tx.k.toString('base64'),
        nonce: tx.n
      },
      rx: [
        {
          key: rx.k.toString('base64')
        }
      ]
    }
  }
  sessionsStore[key] = session
}

/**
 * Loads the session for the device id.
 *
 * @param {string} deviceId the device id.
 * @returns {Object} if a session exists. null otherwise.
 */
async function loadSession (deviceId) {
  const key = 'state_' + deviceId
  return sessionsStore[key]
}

/**
 * Updates a session.
 * @param {string} deviceId the device id.
 * @param {Object} session the session object.
 */
async function updateSession (deviceId, session) {
  const key = 'state_' + deviceId
  sessionsStore[key] = session
}

/**
 * Executes the responders part of the NK pattern and stores the cipher states to the underlying data store.
 *
 * @param {String} ciphertext the ciphertext.
 * @param {String} deviceId the id of the device.
 * @return {object} an object containing the message as base64 encoded string.
 */
function keyexchange (ciphertext, deviceId) {
  const [message, rx, tx] = handshake(ciphertext)
  storeSession(deviceId, rx, tx)

  return { data: message.toString('base64') }
}

/**
 * Executes a handshake using NK pattern. The ciphertext is a base64 message from the initiator.
 *
 * @param {String} ciphertext a base64 encoded string from the initiator.
 * @return an array containing a message and the two cipher states.
 */
function handshake (ciphertext) {
  const handshakeState = new HandshakeState()
  handshakeState.Initialize('NK', false, Buffer.alloc(0), KEYPAIR, null, null, null)
  handshakeState.ReadMessage(Buffer.from(ciphertext, 'base64'))
  const response = handshakeState.WriteMessage(Buffer.alloc(0))

  return response
}

/**
 * Encrypts plaintext.
 * The key and nonce is loaded from the data store using the device id.
 *
 * @param {String} plaintext the plaintext as a base64 encode string.
 * @param {String} deviceId the device id.
 * @returns an object containing the plaintext (as a base64 encoded string) and the nonce (as a string) used. If anything fails, null is returned.
 */
async function encrypt (plaintext, deviceId) {
  const session = await loadSession(deviceId)

  if (!session) {
    return null
  }

  const cipherState = new CipherState()
  cipherState.InitializeKey(Buffer.from(session.tx.key, 'base64'))
  cipherState.SetNonce(session.tx.nonce)

  try {
    const ciphertext = cipherState.EncryptWithAd(Buffer.alloc(0), Buffer.from(plaintext, 'base64'))

    session.tx.nonce = cipherState.n
    updateSession(deviceId, session)

    return { ciphertext: ciphertext.toString('base64'), nonce: (cipherState.n - BigInt(1)).toString() }
  } catch (error) {
    return null
  }
}

/**
 * Decrypts the ciphertext using the nonce.
 * The key is loaded from the data store using the device id.
 *
 * @param {String} ciphertext a base64 encoded String.
 * @param {BitInt} nonce the nonce used when encrypting the ciphertext.
 * @param {*} deviceId the device id.
 */
async function decrypt (ciphertext, nonce, deviceId) {
  const session = await loadSession(deviceId)

  if (!session) {
    return null
  }

  const cipherState = new CipherState()
  const numberOfKeys = session.rx.length

  for (let i = 0; i < numberOfKeys; i++) {
    const rx = session.rx[i]
    cipherState.InitializeKey(Buffer.from(rx.key, 'base64'))
    cipherState.SetNonce(nonce)

    try {
      const plaintext = cipherState.DecryptWithAd(Buffer.alloc(0), Buffer.from(ciphertext, 'base64'))

      return plaintext.toString()
    } catch (error) {
      if (i === numberOfKeys - 1) {
        return null
      } else {
        continue
      }
    }
  }
}

export default async function () {
  // create the msafety subfolder
  try {
    await fsStat(UPLOADSDIR + '/' + MSAFETYSUBDIR)
  } catch (err) {
    fsMkdir(msafetyDir, { recursive: true })
  }

  // webhook for mSafety data
  router.post('/msafety/webhook/', async function (req, res) {
    // temporary implementation, just writes any message to file
    const ts = new Date().getTime()
    let filehandle
    // parse the data and check the auth code
    if (req.headers.authkey === config.mSafety.webhookAuthKey) {
      if (req.body.pubDataItems) {
        for (const pubdata of req.body.pubDataItems) {
          if (pubdata.type === 'device' && pubdata.event === 'sensors') {
            const deviceId = pubdata.deviceId

            // create the device-specific subfolder
            const deviceDir = msafetyDir + deviceId
            try {
              await fsStat(deviceDir)
            } catch (err) {
              fsMkdir(deviceDir, { recursive: true })
            }

            if (deviceId) {
              const filename = '/sensor_' + deviceId + '_' + ts + '.json'
              try {
                filehandle = await fsOpen(deviceDir + filename, 'w')
                const text = JSON.stringify(pubdata.jsonData)
                await filehandle.writeFile(text)
              } catch (err) {
                console.error(err)
                applogger.error(err, 'cannot save sensors data mSafety file' + filename)
              } finally {
                if (filehandle) await filehandle.close()
              }
            }
          }
        }
      } else {
        const filename = '/request_' + ts + '.txt'
        applogger.debug('mSafety strange packet received, storing it raw on ' + filename)
        try {
          filehandle = await fsOpen(msafetyDir + filename, 'w')
          const text = JSON.stringify({
            headers: req.headers,
            body: req.body
          })
          await filehandle.writeFile(text)
          res.sendStatus(200)
        } catch (err) {
          res.sendStatus(500)
          applogger.error(err, 'cannot save mSafety file' + filename)
        } finally {
          if (filehandle) await filehandle.close()
        }
      }
    }
  })

  // key exchange protocol
  router.post('/msafety/keyexchange/', async function (req, res) {
    const body = req.body
    if (!body || !body.data) {
      res.status(400).send('data was not passed in the post body.')
      return
    }
    const ciphertext = body.data
    const deviceId = req.query.deviceId

    try {
      const response = keyexchange(ciphertext, deviceId)
      res.send(response)
    } catch (err) {
      console.error(err)
      res.sendStatus(500)
    }
  })

  // Handles an encrypt request
  router.post('/msafety/encrypt/', async function (req, res) {
    const body = req.body

    if (!body || !body.data) {
      res.status(400).send('data was not passed in the post body.')
      return
    }

    const plaintext = body.data
    const deviceId = req.query.deviceId

    if (!deviceId) {
      res.status(400).send('deviceId is a required parameter.')
      return
    }

    const result = await encrypt(plaintext, deviceId)

    if (result) {
      res.send(result)
    } else {
      res.status(500).send('Could not encrypt')
    }
  })

  // handles decrypt requests
  router.post('/msafety/decrypt/', async function (req, res) {
    const body = req.body

    if (!body || !body.data) {
      res.status(400).send('data was not passed in the post body.')
      return
    }

    const ciphertext = body.data
    const nonce = body.nonce
    const deviceId = req.query.deviceId

    if (!nonce) {
      res.status(400).send('nonce was not passed in the post body.')
      return
    }

    if (!deviceId) {
      res.status(400).send('deviceId is a required parameter.')
      return
    }

    const plaintext = await decrypt(ciphertext, BigInt(nonce), deviceId)

    if (plaintext) {
      res.send(plaintext.toString('base64'))
    } else {
      res.status(500).send('could not decrypt', ciphertext, 'with nonce', nonce)
    }
  })

  // Handles a data request
  router.post('/msafety/data/', async function (req, res) {
    const body = req.body
    const ciphertext = body.data
    const nonce = BigInt(body.nonce)
    const deviceId = req.query.deviceId

    const plaintext = await decrypt(ciphertext, nonce, deviceId)

    const plaintextBuffer = Buffer.from(plaintext, 'utf8').toString('base64')

    const encryptData = await encrypt(plaintextBuffer, deviceId)

    if (encryptData) {
      res.send(encryptData)
    } else {
      res.status(500).send('Could not decrypt or encrypt the data.')
    }
  })

  return router
}
