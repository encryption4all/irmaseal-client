const { Sealer, Chunker } = require('./stream')
const { KEYSIZE, IVSIZE, TAGSIZE, DEFAULT_CHUNK_SIZE } = require('./stream')
const {
  symcrypt,
  createFileReadable,
  createUint8ArrayReadable,
} = require('./util')

const CachePlugin = require('./cache')

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
   * @param {String} params, parameters received from /parameters of PKG.
   * @param {Object} module, the imported WASM module.
   * @param {Object} constants, encryption constants from the rust side.
   */
  constructor(url, params, module, constants) {
    this.url = url
    this.params = params
    this.module = module
    this.constants = constants
  }

  /**
   * Creates a new client to interact with a PKG at the given url.
   * @static
   * @param {String} url - url of the PKG with which the client connects, required.
   * @param {Object} [localStorage], localStorage API object, optional.
   * @returns {Promise<Client>} client, an initialized client.
   */
  static async build(url) {
    const resp = await fetch(`${url}/v1/parameters`)
    const params = JSON.parse(await resp.text())
    const module = await import('@e4a/irmaseal-wasm-bindings')
    const constants = module.constants()
    const {
      key_size,
      iv_size,
      block_size,
      mac_size,
      symmetric_id,
      verifier_id,
    } = constants

    // Validate all constants to match expected values or error
    if (key_size !== KEYSIZE || iv_size !== IVSIZE || mac_size !== TAGSIZE)
      throw new Error('key, nonce or tag has wrong size')
    if (symmetric_id !== 'AES256-CTR64BE' || verifier_id !== 'SHA3-256')
      throw new Error('unsupported aead encryption parameters')
    if (block_size !== DEFAULT_CHUNK_SIZE)
      throw new Error(
        'mismatch in chunk size to be encrypted by symmetric cipher'
      )

    return new Client(url, params, module, constants)
  }

  /**
   * Create a new Metadata object.
   * @param {Attribute} attribute.
   * @return {MetadataCreateResult} metadata.
   */
  createMetadata(attribute) {
    return new this.module.MetadataCreateResult(
      attribute.type,
      attribute.value,
      this.params.public_key
    )
  }

  /**
   * Extract Metadata from a ReadableStream.
   * Reads the stream no further then needed to extract the metadata.
   * @async
   * @param {ReadableStream} - readablestream.
   * @returns {Promise<Object>} - result.
   * @returns {Metadata} - result.metadata - the Metadata object extracted from the stream.
   * @returns {Uint8Array} - result.header - the raw header bytes.
   * @returns {ReadableStream} - result.readable - an unread tee'd version of the stream.
   */
  async extractMetadata(readable) {
    const [stream1, stream2] = readable.tee()
    let reader = stream1.getReader()
    let metadataReader = new this.module.MetadataReader()

    var res, value, done
    while (true) {
      var { done, value } = await reader.read()
      res = metadataReader.feed(value)
      if (res.done || done) break
    }

    reader.releaseLock()
    return { metadata: res.metadata, header: res.header, readable: stream2 }
  }

  createTransformStream(options) {
    return new TransformStream(new Sealer(options))
  }

  createChunker(options) {
    return new TransformStream(
      new Chunker(
        Object.assign(options, { chunkSize: this.constants.block_size })
      )
    )
  }

  symcrypt(options) {
    return symcrypt(options)
  }

  createFileReadable(file, options = {}) {
    return createFileReadable(file, options)
  }

  createUint8ArrayReadable(array, options = {}) {
    return createUint8ArrayReadable(array, options)
  }

  /*
   * Returns a session at the PKG.
   * Result of the session is the user secret key (USK).
   * @param {Attribute} identity.
   * @param {number} timestamp.
   */
  createPKGSession(identity, timestamp) {
    return {
      identity: identity,
      timestamp: timestamp,
      maxAge: this.params.max_age,
      url: this.url,
      start: {
        url: (o) => `${o.url}/v1/request`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attribute: identity,
        }),
      },
      state: { serverSentEvents: false },
      mapping: {
        sessionPtr: (r) => JSON.parse(r.qr),
      },
      result: {
        url: (o, { sessionToken: token }) =>
          `${o.url}/v1/request/${token}/${o.timestamp.toString()}`,
        parseResponse: (r) => {
          return new Promise((resolve, reject) => {
            if (r.status != '200') reject('not ok')
            r.json().then((json) => {
              if (json.status !== 'DONE_VALID') reject('not done and valid')
              resolve(json.key)
            })
          })
        },
      },
    }
  }
}

module.exports = {
  Client,
  CachePlugin,
}
