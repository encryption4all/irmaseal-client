const Buffer = require('buffer/').Buffer
const { createSHA3, sha3 } = require('hash-wasm')

// Sizes in bytes
const KEYSIZE = 32
const BLOCKSIZE = 16
const NONCESIZE = 12
const COUNTERSIZE = 4 // do not encrypt more than 2^32 blocks = 2^36 bytes = 68GB!!

class SealTransform extends TransformStream {
  constructor({ secret, nonce, decrypt = false }) {
    super({
      async start(controller) {
        console.log('Start processing stream')
        if (secret.byteLength !== KEYSIZE || nonce.byteLength !== NONCESIZE)
          throw new Error('key or nonce wrong size')

        // (aesKey ||  macKey) = SHA3-512(k)
        const out = await sha3(secret, 512)
        const outBytes = Buffer.from(out, 'hex')
        const aesKey = new Uint8Array(outBytes.buffer, 0, KEYSIZE)
        const macKey = new Uint8Array(outBytes.buffer, KEYSIZE, KEYSIZE)

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
        this.nonce = new Uint8Array(nonce).reverse()
        this.counter = Uint8Array.from('0'.repeat(COUNTERSIZE))

        // Start an incremental HMAC with SHA-3
        // which is just H(k || m)
        this.hash = await createSHA3(256)
        this.hash.update(macKey)
      },
      async transform(chunk, controller) {
        const blocks = Math.ceil(chunk.byteLength / BLOCKSIZE)
        const iv = new Uint8Array([...this.nonce, ...this.counter])

        console.log(
          `[chunk]: length: ${
            chunk.byteLength
          }, blocks: ${blocks}, type: ${typeof chunk}`
        )

        const fn = async (...args) =>
          decrypt
            ? window.crypto.subtle.decrypt(...args)
            : window.crypto.subtle.encrypt(...args)

        if (decrypt) this.hash.update(chunk)

        var processedChunk = await fn(
          {
            name: 'AES-CTR',
            counter: iv,
            length: COUNTERSIZE * 8, // length of the counter, in bits
          },
          this.aesKey,
          chunk
        )
        processedChunk = new Uint8Array(processedChunk)

        if (!decrypt) this.hash.update(processedChunk)

        controller.enqueue(processedChunk)

        // Update the counter
        var view = new DataView(this.counter.buffer)
        var value = view.getUint32(0, false)
        value += blocks
        view.setUint32(0, value, false)
      },
      flush(controller) {
        console.log('Stream fully processed')
        const tag = this.hash.digest()
        console.log('Authentication tag: ', tag)
      },
    })
  }
}

module.exports = SealTransform
