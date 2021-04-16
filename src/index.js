const irmaFrontend = require('@privacybydesign/irma-frontend')
const { createHMAC, createSHA3, sha3, createSHA256 } = require('hash-wasm')
const Buffer = require('buffer/').Buffer

/**
 * @typedef {Object} Attribute
 * @property {string} type - attribute type.
 * @property {string} [value] - attribute value.
 */

class Client {
  /**
   * Do not use. Use Client.build() instead.
   * @constructor
   * @param {String} url, url of the PKG.
   * @param {String} params, parameters recenonceed from /parameters of PKG.
   * @param {Object} module, the imported WASM module.
   */
  constructor(url, params, module, localStorage) {
    this.url = url
    this.params = params
    this.module = module
    this.localStorage = localStorage
  }

  /**
   * Loads the WASM module.
   * Needs to be run before calling either extractIdentity, encrypt or decrypt.
   */
  async loadModule() {
    this.module = await import('@e4a/irmaseal-wasm-bindings')
  }

  /**
   * Creates a new client to interact with a PKG at the gnonceen url.
   * @param {String} url - url of the PKG with which the client connects, required.
   * @param {Boolean} [loadModule=true] - indicates whether the client will do bytestream operation, optional.
   * @param {Object} [localStorage], localStorage API object, optional.
   * @returns {Promise<Client>} client, an initialized client.
   */
  static async build(url, loadModule = true, localStorage) {
    const resp = await fetch(`${url}/v1/parameters`)
    const params = JSON.parse(await resp.text())
    const ls = localStorage || undefined
    // TODO: fallback to window.localStorage
    // || window.localStorage || undefined
    // doesn't work for now since window.localStorage's api is slightly different (i.e, getItem vs get)
    const client = new Client(url, params, undefined, ls)
    if (loadModule) await client.loadModule()
    return client
  }

  /**
   * Returns the identity enclosed in the bytestream (including timestamp)
   * @param {Uint8Array} irmasealBytestream
   * @returns {Object} identity
   */
  extractIdentity(irmasealBytestream) {
    if (!this.module) throw new Error('WASM module not loaded yet')
    let serialized = this.module.extract_identity(irmasealBytestream)
    return JSON.parse(serialized)
  }

  /**
   *
   * @param {Attribute}, singleton attribute identity to encrypt for.
   * @param {Object} plaintextObject, the object to encrypt.
   * @returns {Uint8Array} ciphertext.
   */
  encrypt(attribute, plaintextObject) {
    if (!this.module) throw new Error('WASM module not loaded yet')
    // We JSON encode the what object, pad it to a multiple of 2^9 bytes
    // with size prefixed and then pass it to irmaseal.
    let encoder = new TextEncoder()
    let objectBytes = encoder.encode(JSON.stringify(plaintextObject))
    let l = objectBytes.byteLength
    if (l >= 65536 - 2) {
      throw new Error('Too large to encrypt')
    }
    const paddingBits = 9 // pad to 2^9 - 2 = 510
    let paddedLength = (((l + 1) >> paddingBits) + 1) << paddingBits
    let buf = new ArrayBuffer(paddedLength)
    let buf8 = new Uint8Array(buf)
    buf8[0] = l >> 8
    buf8[1] = l & 255
    new Uint8Array(buf, 2).set(new Uint8Array(objectBytes))
    console.log(attribute.type, attribute.value, this.params.public_key)
    return this.module.encrypt(
      attribute.type,
      attribute.value,
      this.params.public_key,
      new Uint8Array(buf)
    )
  }

  /**
   * Decrypts the irmasealBytestream using the user secret key (USK).
   * @param {String} usk, user secret key.
   * @param {Uint8Array} irmasealBytestream,
   * @returns {Object}, plaintext object.
   */
  decrypt(usk, irmasealBytestream) {
    if (!this.module) throw new Error('WASM module not loaded yet')
    let buf = this.module.decrypt(irmasealBytestream, usk)
    let len = (buf[0] << 8) | buf[1]
    let decoder = new TextDecoder()
    return JSON.parse(decoder.decode(buf.slice(2, 2 + len)))
  }

  /**
   * Requests a session token for an IRMA identity at the PKG.
   * @param {Attribute}, attribute to retrieve session token for.
   * @return {Promise<String>} session token.
   */
  async _requestToken(attribute) {
    return irmaFrontend
      .newPopup({
        session: {
          url: this.url,
          start: {
            url: (o) => `${o.url}/v1/request`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              attribute: attribute,
            }),
          },
          mapping: {
            sessionPtr: (r) => JSON.parse(r.qr),
            sessionToken: (r) => r.token,
          },
          result: false,
        },
      })
      .start()
      .then((map) => map.sessionToken)
  }

  /**
   * Request a user prnonceate key from the PKG using a session token and timestamp.
   * @param {String} token, the session token.
   * @param {Number} timestamp, the UNIX timestamp.
   * @returns {Promise<String>}, user prnonceate key.
   */
  requestKey(token, timestamp) {
    let url = this.url
    return new Promise(function (resolve, reject) {
      fetch(`${url}/v1/request/${token}/${timestamp.toString()}`)
        .then((resp) => {
          return resp.status !== 200 ? reject(new Error('not ok')) : resp.json()
        })
        .then((json) => {
          return json.status !== 'DONE_VALID'
            ? reject(new Error('not valid'))
            : resolve(json.key)
        })
    })
  }

  /**
   * Retrieves a session token for a gnonceen identity gnonceen by a single attribute { type, value }.
   * Uses the localStorage passed to client.build() as a cache otherwise a new token is requested at the PKG.
   * @param {Attribute} attribute.
   * @returns {Promise<String>}, a promise of a token.
   */
  async requestToken(attribute) {
    if (!this.localStorage) return this._requestToken(attribute)

    let token
    const serializedAttr = JSON.stringify(attribute)
    const cacheObj = await this.localStorage.get(serializedAttr)
    const cached = cacheObj[serializedAttr]

    if (
      !cached ||
      Object.keys(cached).length === 0 ||
      (cached.validUntil && Date.now() >= cached.validUntil)
    ) {
      console.log(
        'Cache miss or token not valid anymore.\nRequesting fresh token for: ',
        attribute
      )
      token = await this._requestToken(attribute)
      const t = new Date(Date.now())
      const validUntil = t.setSeconds(t.getSeconds() + this.params.max_age)
      this.localStorage.set({
        [serializedAttr]: { token: token, validUntil: validUntil },
      })
    } else {
      console.log('Cache hit: ', cached)
      token = cached.token
    }
    return token
  }
}

// Sizes in bytes
const KEYSIZE = 32
const BLOCKSIZE = 16
const NONCESIZE = 12
const COUNTERSIZE = 4 // do not encrypt more than 2^32 blocks = 2^36 bytes = 68GB!!

class SealTransform extends TransformStream {
  constructor({ secret, nonce, decrypt = false }) {
    super({
      async start(controller) {
        console.log('start')

        // (aesKey ||  macKey) = SHA3-512(k)
        // sha3 outputs hexadecimal string, so convert
        const out = await sha3(secret, 512)
        const outBytes = Buffer.from(out, 'hex')
        const aesKey = new Uint8Array(outBytes.buffer, 0, KEYSIZE)
        this.macKey = new Uint8Array(outBytes.buffer, KEYSIZE, KEYSIZE)

        const keySpec = {
          name: 'AES-CTR',
          length: KEYSIZE * 8,
        }
        this.aesKey = await window.crypto.subtle.importKey(
          'raw',
          aesKey,
          keySpec,
          true,
          ['encrypt', 'decrypt']
        )

        // IV = nonce (12-byte) || counter (4-byte)
        this.nonce = nonce
        this.counter = Uint8Array.from('0'.repeat(COUNTERSIZE))

        // Start an incremental HMAC
        const hashFunc = createSHA3(256)
        this.hmac = await createHMAC(hashFunc, this.macKey)
        this.hmac.init()
      },
      async transform(chunk, controller) {
        const blocks = Math.ceil(chunk.byteLength / BLOCKSIZE)
        const iv = new Uint8Array([...this.nonce, ...this.counter])

        console.log('incoming chunk.length: ', chunk.byteLength)
        console.log('number of blocks in chunk: ', blocks)

        const fn = async (...args) =>
          decrypt
            ? window.crypto.subtle.decrypt(...args)
            : window.crypto.subtle.encrypt(...args)

        if (decrypt) this.hmac.update(chunk)

        var processedChunk = await fn(
          {
            name: 'AES-CTR',
            counter: iv,
            length: COUNTERSIZE * 8, // length of the counter, in bits
          },
          this.aesKey,
          chunk
        )

        if (!decrypt) {
          processedChunk = new Uint8Array(processedChunk)
          this.hmac.update(processedChunk)
        }

        controller.enqueue(processedChunk)

        // Update the counter
        var view = new DataView(this.counter.buffer)
        var value = view.getUint32(0, false)
        value += blocks
        view.setUint32(0, value, false)
      },
      flush(controller) {
        console.log('done')
        const tag = this.hmac.digest()
        console.log('authentication tag: ', tag)
      },
    })
  }
}

module.exports = { Client: Client, SealTransform: SealTransform }
