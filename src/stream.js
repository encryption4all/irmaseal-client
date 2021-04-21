const Buffer = require('buffer/').Buffer
const { createSHA3 } = require('hash-wasm')

// Sizes in bytes
const CHUNK_SIZE = 1024 * 1024 // 1 MiB

// Encryption constants
const KEYSIZE = 32
const BLOCKSIZE = 16
const NONCESIZE = 12
const COUNTERSIZE = 4 // do not encrypt more than 2^32 blocks = 2^36 bytes = 68GB!!
const TAGSIZE = 32

// Use file or fileHandle or ??
function makeReadableFileStream(file) {
  let offset = 0
  return new ReadableStream({
    async pull(controller) {
      const bytesRead = await file
        .slice(offset, offset + CHUNK_SIZE)
        .arrayBuffer()
      if (bytesRead.byteLength === 0) {
        controller.close()
      } else {
        offset += bytesRead.byteLength
        controller.enqueue(new Uint8Array(bytesRead, 0, bytesRead.byteLength))
      }
    },
  })
}

class SealTransform {
  constructor({ macKey, aesKey, nonce, decrypt = false }) {
    return {
      async start(controller) {
        console.log('Start processing stream')
        if (aesKey.byteLength !== KEYSIZE || nonce.byteLength !== NONCESIZE)
          throw new Error('key or nonce wrong size')

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

        // Start an incremental HMAC with SHA-3 which is just H(k || m)
        this.hash = await createSHA3(256)
        this.hash.update(macKey)

        this.tag = null
      },
      async transform(chunk, controller) {
        const blocks = Math.ceil(chunk.byteLength / BLOCKSIZE)
        const finalBlock = decrypt && chunk.byteLength < CHUNK_SIZE
        if (finalBlock) {
          // This is the final block, we need to split of the tag
          this.tag = chunk.slice(-TAGSIZE)
          chunk = chunk.slice(0, chunk.byteLength - TAGSIZE)
        }
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
        if (!decrypt && finalBlock) controller.enqueue(this.tag)

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
        if (!decrypt) {
          controller.enqueue(Buffer.from(tag, 'hex'))
        } else {
          console.log('tag in stream: ', Buffer.from(this.tag).toString('hex'))
          console.log('own tag: ', tag)
          if (this.tag.normalize() !== tag.normalize()) {
            console.log('tags are unequal')
          }
        }
      },
    }
  }
}

module.exports = {
  SealTransform: SealTransform,
  makeReadableFileStream: makeReadableFileStream,
}
