/**
 * Noise protocol implementation fo mSafety.
 */

import crypto from 'crypto'
import nacl from 'tweetnacl'

const MAX_NONCE = BigInt(2) ** BigInt(64) - BigInt(1)
const DHLEN = 32
const HASHLEN = 32
const KEY_LENGTH = 32
const INPUT_KEY_MATERIAL_LENGTH = 32
const TAG_LENGTH = 16
const HMAC_ALGORITHM = 'sha256'

const algorithm = 'aes-256-gcm'

/**
 *
 * @param {Array<String>} preMessages an array of strings representing pre-messages.
 * If there are multiple pre-messages the initiators is listed first
 * (in accordance with http://www.noiseprotocol.org/noise.html#handshake-pattern-basics).
 * @param {Array<Array<String>>} messagePatterns
 */
class MessagePattern {
  constructor (preMessages, messagePatterns) {
    this.preMessages = preMessages
    this.messagePatterns = messagePatterns
  }

  /**
     * Clones the message pattern
     *
     * @returns {MessagePattern} the clone of the message pattern.
     */
  clone () {
    const copy = new MessagePattern([...this.preMessages], [...this.messagePatterns])
    return copy
  }
}

/**
 * Clones the buffer.
 *
 * @returns {Buffer} the clone of the buffer.
 */
Buffer.prototype.clone = function () {
  const target = Buffer.alloc(this.length)
  this.copy(target)

  return target
}

/**
 *
 * @param {String} message the message pattern.
 * @param {Boolean} initiatorsKey true if the message is the public key of the initiator.
 */
class PreMessage {
  constructor (message, initiatorsKey) {
    this.message = message
    this.initiator = initiatorsKey
  }
}

const MESSAGE_PATTERNS = {
  NK: new MessagePattern([new PreMessage('s', false)], [['e', 'es'], ['e', 'ee']]),
  KK: new MessagePattern([new PreMessage('s', true), new PreMessage('s', false)], [['e', 'es', 'ss'], ['e', 'ee', 'se']]),
  XX: new MessagePattern([], [['e'], ['e', 'ee', 's', 'es'], ['s', 'se']])
}

/**
 * Creates a KeyPair containing the public and private key.
 * @param {Buffer} publicKey A buffer holding the public key.
 * @param {Buffer} privateKey A buffer holding the private key.
 */
class KeyPair {
  constructor (publicKey, privateKey) {
    this.publicKey = publicKey
    this.privateKey = privateKey
  }
}

/**
 * Creates a chiper state as described in
 * http://www.noiseprotocol.org/noise.html#the-cipherstate-object
 */
class CipherState {
  constructor () {
    this.k = null
    this.n = null
  }

  /**
     * Initializes the key to the provided value.
     *
     * @param {Buffer} key A buffer holding the key.
     */
  InitializeKey (key) {
    if (key == null || key instanceof Buffer) {
      this.k = key
    } else {
      throw new Error('key must be null or a Buffer.')
    }

    this.n = BigInt(0)
  }

  /**
     * Returns true if k has been initialized.
     *
     * @returns {boolean} true if k has been initialized, false otherwise.
     */
  HasKey () {
    return (this.k != null && this.k !== undefined)
  }

  /**
     * Sets the nonce to the provided value.
     *
     * @param {BigInt} nonce the nonce as a BigInt value.
     */
  SetNonce (nonce) {
    const isBigInt = typeof nonce === 'bigint'

    if (isBigInt && nonce < MAX_NONCE) {
      this.n = nonce
    } else {
      throw new Error(`Nonce was not a valid BigInt. Max nonce is ${MAX_NONCE}`)
    }
  }

  /**
     * Encrypts the plaintext using the additional data.
     *
     * @param {Buffer} ad a buffer containing the additional data. To use no additional data, send null or a buffer of length 0.
     * @param {Buffer} plaintext a buffer containing the data to encrypt.
     * @returns {Buffer} a buffer containing the encrypted data.
     */
  EncryptWithAd (ad, plaintext) {
    if (!this.k) {
      return plaintext
    }

    if (this.n === MAX_NONCE) {
      throw new Error('Max nonce reached')
    }

    const encrypted = ENCRYPT(this.k, this.n, ad, plaintext)
    this.n += BigInt(1)

    return encrypted
  }

  /**
     * Decrypts the chiphertext using the additional data.
     *
     * @param {Buffer} ad a buffer containing additional data. To use no additional data, send null or a buffer of length 0.
     * @param {Buffer} ciphertext a buffer containing the data to decrypt.
     * @returns {Buffer} a buffer containing the decrypted data.
     */
  DecryptWithAd (ad, ciphertext) {
    if (!this.k) {
      return ciphertext
    }

    if (this.n === MAX_NONCE) {
      throw new Error('Max nonce reached')
    }

    const decrypted = DECRYPT(this.k, this.n, ad, ciphertext)
    this.n += BigInt(1)

    return decrypted
  }

  /**
     * Creates a new key.
     */
  Rekey () {
    this.k = REKEY(this.k)
  }
}

/**
 * Creates a symmetric state in accordance with
 * http://www.noiseprotocol.org/noise.html#the-symmetricstate-object
 */
class SymmetricState {
  constructor () {
    this.protocolName = ''
    this.ck = Buffer.alloc(HASHLEN)
    this.h = Buffer.alloc(HASHLEN)
    this.cipherState = new CipherState()
  }

  /**
     * Initializes the symmetric state using the protocol name.
     *
     * @param {String} protocolName a String holding the protocol name.
     */
  InitializeSymmetric (protocolName) {
    const protocolNameBuffer = Buffer.from(protocolName, 'utf8')

    if (protocolNameBuffer.length <= HASHLEN) {
      const padding = Buffer.alloc(HASHLEN - protocolNameBuffer.length)
      const paddedBuffer = Buffer.concat([protocolNameBuffer, padding])
      this.h = paddedBuffer
    } else {
      this.h = HASH(protocolName)
    }

    this.ck = this.h
    this.cipherState.InitializeKey(null)
  }

  /**
     * Mixes the key of the cipher state using the input material.
     *
     * @param {Buffer} inputKeyMaterial a buffer holding the input material for the key.
     */
  MixKey (inputKeyMaterial) {
    const hkdf = HKDF(this.ck, inputKeyMaterial, 2)
    this.ck = hkdf[0]
    const tempKey = hkdf[1]
    this.cipherState.InitializeKey(tempKey)
  }

  /**
     * Updates the hash with the data.
     *
     * @param {Buffer} data a buffer holding the data to mix with the hash.
     */
  MixHash (data) {
    const dataBuffer = Buffer.concat([this.h, data])
    this.h = HASH(dataBuffer)
  }

  /**
     * Creates a new chaining key, a new key for the cipher state and
     * updates the hash.
     *
     * @param {Buffer} inputKeyMaterial a buffer holding the input material for the key.
     */
  MixKeyAndHash (inputKeyMaterial) {
    const hkdf = HKDF(this.ck, inputKeyMaterial, 3)
    this.ck = hkdf[0]
    const tempHash = hkdf[1]
    const tempKey = hkdf[2]
    this.MixHash(tempHash)
    this.cipherState.InitializeKey(tempKey)
  }

  /**
     * Returns the value of the h.
     *
     * @returns {Buffer} a buffer containing the value of h.
     */
  GetHandshakeHash () {
    return this.h.clone()
  }

  /**
     * Encrypts the plaintext and mixes the hash with the encrypted data.
     *
     * @param {Buffer} plaintext a buffer containing the data to encrypt.
     * @returns {Buffer} a buffer containing encrypted data.
     */
  EncryptAndHash (plaintext) {
    const ciphertext = this.cipherState.EncryptWithAd(this.h, plaintext)
    this.MixHash(ciphertext)

    return ciphertext
  }

  /**
     * Decrypts the ciphertext and mixes the hash with the ciphertext.
     *
     * @param {Buffer} ciphertext a buffer containing the encrypted data.
     * @returns {Buffer} a buffer containing the encrypted data.
     */
  DecryptAndHash (ciphertext) {
    const plaintext = this.cipherState.DecryptWithAd(this.h, ciphertext)
    this.MixHash(ciphertext)

    return plaintext
  }

  /**
     * Splits the cipher state in to two new cipher states.
     *
     * @returns {Array<CipherState>} an array containing the two new cipher states.
     */
  Split () {
    const [firstTempKey, secondTempKey] = HKDF(this.ck, Buffer.alloc(0), 2)
    const c1 = new CipherState()
    const c2 = new CipherState()

    c1.InitializeKey(firstTempKey)
    c2.InitializeKey(secondTempKey)

    return [c1, c2]
  }
}

/**
 * Creates a handshake state in accordance to
 * http://www.noiseprotocol.org/noise.html#the-handshakestate-object
 */
class HandshakeState {
  constructor () {
    this.symmetricState = new SymmetricState()
    this.s = null
    this.e = null
    this.rs = null
    this.re = null
    this.initiator = false
    // this.messagePatterns
  }

  /**
     * Initializes the handshake state using the input parameters. Use null to indicate that a parameter has no value.
     *
     * @param {String} handshake_pattern a String containing the handshake pattern.
     * @param {boolean} initiator true if being the initiator of the handshake.
     * @param {Buffer} prologue a buffer containing any prolog data. null will be interpreted as a buffer of length 0.
     * @param {KeyPair} s a KeyPair containing the static keys.
     * @param {KeyPair} e a KeyPair containing the ephemeral keys.
     * @param {KeyPair} rs a KeyPair containing the remote party's public static key.
     * @param {KeyPair} re a KeyPair containing the remote party's public ephemeral key.
     */
  Initialize (handshakePattern, initiator, prologue, s, e, rs, re) {
    const implementedPatterns = Object.keys(MESSAGE_PATTERNS)
    if (!(implementedPatterns.includes(handshakePattern))) {
      throw new Error(`${handshakePattern} is not supported.\nSupported patterns are ${implementedPatterns}`)
    }

    const protocolName = `Noise_${handshakePattern}_25519_AESGCM_SHA256`
    this.symmetricState.InitializeSymmetric(protocolName)

    if (prologue) {
      this.symmetricState.MixHash(prologue)
    } else {
      this.symmetricState.MixHash(Buffer.alloc(0))
    }

    this.initiator = initiator
    this.s = s
    this.e = e
    this.rs = rs
    this.re = re
    this.messagePatterns = MESSAGE_PATTERNS[handshakePattern].clone().messagePatterns

    const preMessages = MESSAGE_PATTERNS[handshakePattern].clone().preMessages

    if (preMessages.length > 0) {
      for (const preMessage of preMessages) {
        switch (preMessage.message) {
          case 's':
            if (preMessage.initiatorsKey) {
              if (this.initiator) {
                this.symmetricState.MixHash(this.s.publicKey)
              } else {
                this.symmetricState.MixHash(this.rs.publicKey)
              }
            } else {
              if (this.initiator) {
                this.symmetricState.MixHash(this.rs.publicKey)
              } else {
                this.symmetricState.MixHash(this.s.publicKey)
              }
            }
            break
          default:
            console.log('Unknown premessage type:', preMessage)
        }
      }
    }
  }

  /**
     * Takes the payload (a Buffer) and writes it in accordance with the message pattern.
     * The response is an array containing the encrypted message (As a buffer).
     * If there are no more message pattern tokens to process the response will also
     * include two cipherstates.
     *
     * @param {Buffer} payload a buffer containing the payload to encrypt.
     * @returns {Array} an array containing a buffer with the encrypted message and two cipherstates if there
     * are no more message tokens to process.
     */
  WriteMessage (payload) {
    const messagePatterns = this.messagePatterns.shift()
    let tempBuffer = Buffer.alloc(0)
    for (const pattern of messagePatterns) {
      switch (pattern) {
        case 'e':
          this.e = GENERATE_KEYPAIR()
          tempBuffer = Buffer.concat([tempBuffer, this.e.publicKey])
          this.symmetricState.MixHash(this.e.publicKey)

          break
        case 's': {
          const encrypted = this.symmetricState.EncryptAndHash(this.s.publicKey)
          tempBuffer = Buffer.concat([tempBuffer, encrypted])

          break
        }
        case 'ee':
          this.symmetricState.MixKey(DH(this.e, this.re.publicKey))
          break
        case 'es':
          if (this.initiator) {
            this.symmetricState.MixKey(DH(this.e, this.rs.publicKey))
          } else {
            this.symmetricState.MixKey(DH(this.s, this.re.publicKey))
          }

          break
        case 'se':
          if (this.initiator) {
            this.symmetricState.MixKey(DH(this.s, this.re.publicKey))
          } else {
            this.symmetricState.MixKey(DH(this.e, this.rs.publicKey))
          }

          break
        case 'ss':
          this.symmetricState.MixKey(DH(this.s, this.rs.publicKey))

          break
        default:
          console.log('unknown pattern', pattern)
      }
    }

    const encryptedPayload = this.symmetricState.EncryptAndHash(payload)
    tempBuffer = Buffer.concat([tempBuffer, encryptedPayload])

    if (this.messagePatterns.length === 0) {
      const [firstCipherState, secondCipherState] = this.symmetricState.Split()

      return [tempBuffer, firstCipherState, secondCipherState]
    } else {
      return [tempBuffer]
    }
  }

  /**
     * Decrypts the message (a Buffer) and returns an array containing a buffer with the decrypted message.
     * If there are no more message pattern tokens to process the response will also
     * include two cipherstates.
     *
     * Use the other sides message pattern to get "the same" key to decrypt.
     *
     * @param {Buffer} message a buffer containing the message to read.
     * @returns {Array} an array containing a buffer with the decrypted message and two cipherstates if there
     * are no more message tokens to process.
     */
  ReadMessage (message) {
    const messagePatterns = this.messagePatterns.shift()
    let ciphertext = Buffer.concat([Buffer.alloc(0), message])

    for (const pattern of messagePatterns) {
      switch (pattern) {
        case 'e': {
          const temp = ciphertext.slice(0, DHLEN)
          this.re = new KeyPair(temp)
          this.symmetricState.MixHash(this.re.publicKey)
          ciphertext = ciphertext.slice(DHLEN)
          break
        }
        case 's': {
          let temp
          const hasKey = this.symmetricState.cipherState.HasKey()

          if (hasKey) {
            temp = ciphertext.slice(0, DHLEN + TAG_LENGTH)
            ciphertext = ciphertext.slice(DHLEN + TAG_LENGTH)
          } else {
            temp = ciphertext.slice(0, DHLEN)
            ciphertext = ciphertext.slice(DHLEN)
          }

          this.rs = new KeyPair(this.symmetricState.DecryptAndHash(temp))

          break
        }
        case 'ee':
          this.symmetricState.MixKey(DH(this.e, this.re.publicKey))

          break
        case 'es':
          if (this.initiator) {
            this.symmetricState.MixKey(DH(this.e, this.rs.publicKey))
          } else {
            this.symmetricState.MixKey(DH(this.s, this.re.publicKey))
          }

          break
        case 'se':
          if (this.initiator) {
            this.symmetricState.MixKey(DH(this.s, this.re.publicKey))
          } else {
            this.symmetricState.MixKey(DH(this.e, this.rs.publicKey))
          }

          break
        case 'ss':
          this.symmetricState.MixKey(DH(this.s, this.rs.publicKey))

          break
        default:
          console.log('unknown pattern', pattern)
      }
    }

    const decryptedPayload = this.symmetricState.DecryptAndHash(ciphertext)

    if (this.messagePatterns.length === 0) {
      const [firstCipherState, secondCipherState] = this.symmetricState.Split()

      return [decryptedPayload, firstCipherState, secondCipherState]
    } else {
      return [decryptedPayload]
    }
  }
}

/**
 * Converts a BigInt to a buffer containing the nonce.
 *
 * @param {BigInt} nonce
 * @returns {Buffer} a buffer containing the nonce.
 */
function nonceToIv (nonce) {
  const nonceBuf = Buffer.alloc(8)

  for (let i = 7; i >= 0; i--) {
    nonceBuf[i] = Number(BigInt.asUintN(8, nonce))
    nonce = nonce >> BigInt(8)
  }

  return Buffer.concat([Buffer.alloc(4), nonceBuf], 12)
}

/**
 * Generates a Diffie-Hellman key pair.
 *
 * @returns {KeyPair} the KeyPair.
 */
function GENERATE_KEYPAIR () {
  const keyPair = nacl.box.keyPair()
  const publicKey = Buffer.from(keyPair.publicKey)
  const privateKey = Buffer.from(keyPair.secretKey)

  return new KeyPair(publicKey, privateKey)
}

/**
 * Executes a scalar multiplication on the secret key of the key pair and the public key and returns the result
 *
 * @param {KeyPair} keyPair a KeyPair.
 * @param {Buffer} publicKey a buffer containing the public key.
 * @returns {Buffer} a buffer containing the result.
 */
function DH (keyPair, publicKey) {
  const result = Buffer.from(nacl.scalarMult(keyPair.privateKey, publicKey))

  return result
}

/**
 * Encrypts a message using a key, a nonce and some additional data.
 * Throws an Error if the key is not valid.
 *
 * @param {Buffer} k a buffer containing the key to use when encrypting.
 * @param {Buffer} n a buffer containing the nonce to use when encrypting.
 * @param {Buffer} ad a buffer containing any additional data to use when encrypting.
 *               To not use any additional data pass null or a buffer of length 0.
 * @param {Buffer} plaintext a buffer containing the data to encrypt.
 */
function ENCRYPT (k, n, ad, plaintext) {
  if (!k || k.length !== KEY_LENGTH) {
    throw new Error(`Key must be ${KEY_LENGTH} bytes`)
  }

  const nonce = nonceToIv(n)
  const cipher = crypto.createCipheriv(algorithm, k, nonce)

  let additionalData

  if (!ad) {
    additionalData = Buffer.alloc(0)
  } else {
    additionalData = ad
  }

  cipher.setAAD(additionalData)

  const first = cipher.update(plaintext)
  const second = cipher.final()
  const encodedBuffer = Buffer.concat([first, second])

  const tag = cipher.getAuthTag()
  const ciphertext = Buffer.concat([encodedBuffer, tag])

  return ciphertext
}

/**
 * Decrypts a message using a key, a nonce and some additional data.
 *
 * @param {Buffer} k a buffer containing the key to use when decrypting.
 * @param {Buffer} n a buffer containing the nonce to use when decrypting.
 * @param {Buffer} ad a buffer containing any additional data to use when decrypting.
 *               To not use any additional data pass null or a buffer of length 0.
 * @param {Buffer} ciphertext a buffer containing the data to decrypt.
 */
function DECRYPT (k, n, ad, ciphertext) {
  if (!k || k.length < KEY_LENGTH) {
    throw new Error(`Key must be ${KEY_LENGTH} bytes`)
  }

  const nonce = nonceToIv(n)
  const cipher = crypto.createDecipheriv(algorithm, k, nonce)

  try {
    const tag = ciphertext.slice(ciphertext.length - TAG_LENGTH)
    cipher.setAuthTag(tag)
  } catch (error) {
    console.log('Could not extract tag from encoded message', error)
    throw new Error(`The encrypted message must be at least ${TAG_LENGTH} bytes long.`)
  }

  const toDecrypt = ciphertext.slice(0, ciphertext.length - TAG_LENGTH)

  let additionalData

  if (!ad) {
    additionalData = Buffer.alloc(0)
  } else {
    additionalData = ad
  }

  cipher.setAAD(additionalData)

  try {
    const first = cipher.update(toDecrypt)
    const second = cipher.final()
    const decoded = Buffer.concat([first, second])

    return decoded
  } catch (error) {
    console.error('Could not decode message. This could be due to invalid key, nonce or ad', error)
    throw new Error('Decryption failed')
  }
}

/**
 * Creates a new cipherstate key (k) by following the default description in
 * http://www.noiseprotocol.org/noise.html#the-aesgcm-cipher-functions.
 *
 * @param {Buffer} k a buffer holding the old k.
 * @returns {Buffer} a buffer holding the new k.
 */
function REKEY (k) {
  return ENCRYPT(k, MAX_NONCE, null, Buffer.alloc(KEY_LENGTH)).slice(0, KEY_LENGTH)
}

/**
 * Hashes the content of a buffer.
 *
 * @param {Buffer} data buffer with the data that should be hashed.
 * @returns {Buffer} a buffer containing the hash.
 */
function HASH (data) {
  const sha256 = crypto.createHash('sha256')
  sha256.update(data)
  const hash = sha256.digest()

  return hash
}

/**
 * Takes a key (as a Buffer) and data (as a Buffer) and creates a hmac hash.
 *
 * @param {Buffer} key a buffer with the key.
 * @param {Buffer} data a buffer with the data to hash.
 */
function HMAC_HASH (key, data) {
  const hmac = crypto.createHmac(HMAC_ALGORITHM, key)
  hmac.update(data)
  const hash = hmac.digest()

  return hash
}

/**
 * Creates 2 or 3 hashes based on the chaining key and input key material.
 *
 * @param {Buffer} chainingKey A buffer containing the chaining key.
 * @param {Buffer} inputKeyMaterial a buffer containing the key material. Must be of length 0 or 32.
 * @param {Number} numberOfOutputs the number of expected outputs. Can be 2 or 3.
 */
function HKDF (chainingKey, inputKeyMaterial, numberOfOutputs) {
  const allowedNumberOfOutputs = [2, 3]

  if (!allowedNumberOfOutputs.includes(numberOfOutputs)) {
    throw new Error(`wrong number of outputs for HKDF allowed values are ${allowedNumberOfOutputs}`)
  }

  if (!inputKeyMaterial ||
        !(inputKeyMaterial.length === 0 ||
            inputKeyMaterial.length === INPUT_KEY_MATERIAL_LENGTH ||
            inputKeyMaterial.length === DHLEN)) {
    throw new Error(`input key material must a buffer of length 0, ${INPUT_KEY_MATERIAL_LENGTH} or ${DHLEN}`)
  }

  const tempKey = HMAC_HASH(chainingKey, inputKeyMaterial)
  const firstOutput = HMAC_HASH(tempKey, Buffer.from([0x01]))
  const secondInput = Buffer.concat([firstOutput, Buffer.from([0x02])])
  const secondOutput = HMAC_HASH(tempKey, secondInput)

  if (numberOfOutputs === 2) {
    return [firstOutput, secondOutput]
  }

  const thirdInput = Buffer.concat([secondOutput, Buffer.from([0x03])])
  const thirdOutput = HMAC_HASH(tempKey, thirdInput)

  return [firstOutput, secondOutput, thirdOutput]
}

export { HASH, ENCRYPT, DECRYPT, REKEY, HMAC_HASH, HKDF, DH, GENERATE_KEYPAIR, nonceToIv, KeyPair, HandshakeState, CipherState }
