const Buffer = require('buffer/').Buffer
const { createSHA3 } = require('hash-wasm')

// Sizes in bytes
const DEFAULT_CHUNK_SIZE = 1024 * 1024 // 1 MiB

// Encryption constants
const KEYSIZE = 32
const BLOCKSIZE = 16
const NONCESIZE = 12
const COUNTERSIZE = 4 // do not encrypt more than 2^32 blocks = 2^36 bytes = 68GB!!
const TAGSIZE = 32

/**
 * Creates a ReadableStream that tries to take DEFAULT_CHUNK_SIZE bytes
 * of data from the underlying sink till the sink is exhausted.
 * @param {File} file - file sink to read from.
 * @param {number} desiredChunkSize - the desired internal buffer.
 */
function chunkedFileStream(file, desiredChunkSize = DEFAULT_CHUNK_SIZE) {
  let offset = 0
  return new ReadableStream({
    async pull(controller) {
      const bytesRead = await file
        .slice(offset, offset + desiredChunkSize)
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

/**
 * Transforms streams with randomly sized chunked
 * to a stream of chunks containing atleast desiredChunkSize bytes.
 * Only the last chunk is of smaller size.
 */
class Chunker {
  /**
   * Constructs a new chunker.
   * @param {object} obj - the chunker options.
   * @param {number} obj.desiredChunkSize - the desired internal buffer, in bytes.
   */
  constructor({ desiredChunkSize = DEFAULT_CHUNK_SIZE }) {
    return {
      start(controller) {
        this.buf = new ArrayBuffer(desiredChunkSize)
        this.bufOffset = 0
      },
      transform(chunk, controller) {
        var chunkOffset = 0
        while (chunkOffset !== chunk.byteLength) {
          const remainingChunk = chunk.byteLength - chunkOffset
          const remainingBuffer = desiredChunkSize - this.bufOffset
          if (remainingChunk >= remainingBuffer) {
            // Copy part of the chunk that fits in the buffer
            new Uint8Array(this.buf).set(
              chunk.slice(chunkOffset, chunkOffset + remainingBuffer),
              this.bufOffset
            )
            controller.enqueue(new Uint8Array(this.buf))
            chunkOffset += remainingBuffer
            this.bufOffset = 0
          } else {
            // Copy the chunk till the end, it will fit in the buffer
            new Uint8Array(this.buf).set(
              chunk.slice(chunkOffset),
              this.bufOffset
            )
            chunkOffset += remainingChunk
            this.bufOffset += remainingChunk
          }
        }
      },
      flush(controller) {
        // Flush the remaining buffer
        controller.enqueue(new Uint8Array(this.buf, 0, this.bufOffset))
      },
    }
  }
}

/**
 * SealTransform, class of which instances can be used as parameter
 * to new Transform.
 */
class Sealer {
  /**
   * Constructs a new intsance of SealTransform.
   * @param {Object} obj - SealTransform options.
   * @param {Uint8Array} obj.macKey - the MAC key.
   * @param {Uint8Array} obj.aesKey - the AES encryption key.
   * @param {Uint8Array} obj.nonce - the nonce for encryption.
   * @param {boolean} obj.decrypt - whether to run in decryption mode.
   */
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
      },
      async transform(chunk, controller) {
        const blocks = Math.ceil(chunk.byteLength / BLOCKSIZE)

        console.log(
          `[chunk]: length: ${
            chunk.byteLength
          }, blocks: ${blocks}, type: ${typeof chunk}`
        )

        const iv = new Uint8Array([...this.nonce, ...this.counter])

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
        controller.enqueue(processedChunk)

        if (!decrypt) this.hash.update(processedChunk)

        // Update the counter
        var view = new DataView(this.counter.buffer)
        var value = view.getUint32(0, false)
        value += blocks
        view.setUint32(0, value, false)
      },
      flush(controller) {
        const tag = this.hash.digest()
        console.log('Authentication tag: ', tag)
      },
    }
  }
}

module.exports = {
  Sealer,
  Chunker,
  chunkedFileStream,
}
