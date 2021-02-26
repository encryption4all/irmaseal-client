const irmaFrontend = require('@privacybydesign/irma-frontend')

module.exports = {
  Client: class Client {
    // Don't use the constructor -- use Client.build().
    constructor(url, params, module) {
      this.url = url
      this.params = params
      this.module = module
    }

    // Creates a new client for the irmaseal-pkg with the given url.
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

    // Returns the timestamp included an IRMAseal bytestream.
    extractTimestamp(IRMAsealByteStream) {
      return this.module.extract_timestamp(IRMAsealByteStream)
    }

    encrypt({attributeType, attributeValue}, plaintextObject) {
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

    decrypt(userPrivateKey, IRMAsealByteStream) {
      let buf = this.module.decrypt(IRMAsealByteStream, userPrivateKey)
      let len = (buf[0] << 8) | buf[1]
      let decoder = new TextDecoder()
      return JSON.parse(decoder.decode(buf.slice(2, 2 + len)))
    }

    // 1) Start IRMA session, resulting in a token
    requestToken({attributeType, attributeValue}) {
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

    // 2) Acquire a key per timestamp using said token
    requestKey(token, timestamp) {
      let url = this.url
      return new Promise(function (resolve, reject) {
        fetch(`${url}/v1/request/${token}/${timestamp.toString()}`)
          .then((resp) => {
            return resp.status !== 200
              ? reject(new Error('not ok'))
              : resp.json()
          })
          .then((json) => {
            return json.status !== 'DONE_VALID'
              ? reject(new Error('not valid'))
              : resolve(json.key)
          })
      })
    }
  },
}
