const irmaFrontend = require('@privacybydesign/irma-frontend')
const { Sealer, Chunker, chunkedFileStream } = require('./stream')
const { symcrypt } = require('./symcrypt')

/**
 * @typedef {import('@e4a/irmaseal-wasm-bindings').KeySet} KeySet
 * @typedef {import('@e4a/irmaseal-wasm-bindings').Metadata} Metadata
 * @typedef {import('@e4a/irmaseal-wasm-bindings').MetadataCreateResult} MetadataCreateResult
 * @typedef {import('@e4a/irmaseal-wasm-bindings').MetadataReaderResult} MetadataReaderResult
 */

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
   * Creates a new client to interact with a PKG at the given url.
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
   * Create new Metadata.
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
   * @returns {Object} - result.
   * @returns {Metadata} - result.metadata - the Metadata object extracted from the stream.
   * @returns {Uint8Array} - result.header - the raw header bytes.
   */
  async extractMetadata(readable) {
    let reader = readable.getReader({ mode: 'byob' })
    let metadataReader = new this.module.MetadataReader()

    var res, done
    var buf = new ArrayBuffer(512)

    while (true) {
      let view = new Uint8Array(
        buf,
        0,
        Math.min(metadataReader.safe_write_size, 512)
      )
      ;({ value: view, done } = await reader.read(view))
      res = metadataReader.feed(view)
      if (res.done || done) break
    }

    reader.releaseLock()
    return { metadata: res.metadata, header: res.header }
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
   * Request a user private key from the PKG using a session token and timestamp.
   * @param {String} token, the session token.
   * @param {Number} timestamp, the UNIX timestamp.
   * @returns {Promise<String>}, user private key.
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
   * Retrieves a session token for a given identity by a single attribute { type, value }.
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

module.exports = {
  Client,
  Sealer,
  Chunker,
  chunkedFileStream,
  symcrypt,
}
