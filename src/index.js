const irmaFrontend = require('@privacybydesign/irma-frontend')

class Client {
  /**
   * constructor.
   * Do not use. Use Client.build() instead.
   * @constructor
   * @param {String} url, url of the PKG.
   * @param {String} params, parameters received from /parameters of PKG.
   * @param {Object} module, the imported WASM module.
   */
  constructor(url, params, module) {
    this.url = url
    this.params = params
    this.module = module
  }

  /**
   * build.
   * Creates a new client to interact with a PKG at the given url.
   * @param {String} url, url of the PKG with which the client connects.
   * @returns {Promise<Client>} client, an initialized client.
   */
  static build(url) {
    return new Promise(function (resolve, reject) {
      import('@e4a/irmaseal-wasm-bindings')
        .then((module) => {
          fetch(url + '/v1/parameters')
            .then((resp) => resp.text())
            .then((params) => resolve(new Client(url, params, module)))
        })
        .catch((err) => reject(err))
    })
  }

  /**
   * extractTimestamp.
   * Returns the timestamp included an IRMAseal bytestream.
   * @param {Uint8Array} irmasealBytestream, the ciphertext.
   * @returns {Number} timestamp, UNIX timestamp.
   */
  extractTimestamp(irmasealBytestream) {
    return this.module.extract_timestamp(irmasealBytestream)
  }

  /**
   * encrypt.
   *
   * @param {{attributeType: String, attributeValue: String}}, identity to encrypt for.
   * @param {Object} plaintextObject, the object to encrypt.
   * @returns {Uint8Array} ciphertext.
   */
  encrypt({ attributeType, attributeValue }, plaintextObject) {
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
    return this.module.encrypt(
      attributeType,
      attributeValue,
      new Uint8Array(buf),
      this.params
    )
  }

  /**
   * decrypt.
   * Decrypts the irmasealBytestream using the user private key (USK).
   * @param {String} userPrivateKey,
   * @param {Uint8Array} irmasealBytestream,
   * @returns {Object}, plaintext object.
   */
  decrypt(userPrivateKey, irmasealBytestream) {
    let buf = this.module.decrypt(irmasealBytestream, userPrivateKey)
    let len = (buf[0] << 8) | buf[1]
    let decoder = new TextDecoder()
    return JSON.parse(decoder.decode(buf.slice(2, 2 + len)))
  }

  /**
   * requestToken.
   * Requests a session token for an IRMA identity.
   * @param {{attributeType: String, attributeValue: String}}, the IRMA identity.
   * @return {Promise<String>} session token.
   */
  async requestToken({ attributeType, attributeValue }) {
    return irmaFrontend
      .newPopup({
        session: {
          url: this.url,
          start: {
            url: (o) => `${o.url}/v1/request`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              attribute: {
                type: attributeType,
                value: attributeValue,
              },
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
   * requestKey.
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
}

module.exports = { Client: Client }
