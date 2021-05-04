const { createSHA3 } = require('hash-wasm')
const Buffer = require('buffer/').Buffer

// TODO: get constants from rust
// TODO: avoid more copies

const DEFAULT_CHUNK_SIZE = 16 * 1024 // 16 KiB

// Encryption constants
const ALGO = 'AES-CTR'
const KEYSIZE = 32
const BLOCKSIZE = (IVSIZE = 16)
const NONCESIZE = (COUNTERSIZE = 8)
const TAGSIZE = 32

/**
 * Creates a ReadableStream that tries to take DEFAULT_CHUNK_SIZE bytes
 * of data from the underlying sink till the sink is exhausted.
 * @param {File} file - file source to read from.
 * @param {number} chunkSize - the desired internal buffer.
 */
function chunkedFileStream(
  file,
  { offset = 0, chunkSize = DEFAULT_CHUNK_SIZE }
) {
  return new ReadableStream({
    async pull(controller) {
      const bytesRead = await file
        .slice(offset, offset + chunkSize)
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
 * to a stream of chunks containing atleast chunkSize bytes.
 * Only the last chunk is of smaller size.
 * TODO: do not use! There's still a bug in there...
 */
class Chunker {
  /**
   * Constructs a new chunker.
   * @param {object} obj - the chunker options.
   * @param {number} obj.chunkSize - the desired internal buffer, in bytes.
   * @param {number} [obj.offset] - how many bytes to discard of the incoming stream.
   */
  constructor({ offset = 0, chunkSize = DEFAULT_CHUNK_SIZE }) {
    return {
      start(controller) {
        this.buf = new ArrayBuffer(chunkSize)
        this.bufOffset = 0
        this.firstChunk = true
      },
      transform(chunk, controller) {
        var chunkOffset = 0
        if (this.firstChunk) {
          chunkOffset = offset
          this.firstChunk = false
        }
        while (chunkOffset !== chunk.byteLength) {
          const remainingChunk = chunk.byteLength - chunkOffset
          const remainingBuffer = chunkSize - this.bufOffset
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
 * Creates a subtle crypto AES-CTR parameter specification.
 * @param {Uint8Array} iv, the initialization vector.
 */
const _paramSpec = (iv) => {
  return {
    name: ALGO,
    counter: iv,
    length: COUNTERSIZE * 8, // length of the counter, in bits
  }
}

/**
 * Creates a subtle crypto AES key
 * @param {Uint8Array} key, key bytes.
 */
const _createKey = async (key) => {
  const keySpec = {
    name: ALGO,
    length: KEYSIZE * 8,
  }
  return await window.crypto.subtle.importKey('raw', key, keySpec, true, [
    'encrypt',
    'decrypt',
  ])
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
   * @param {Uint8Array} obj.iv - the initialization vector (including 64-bit BE counter) for encryption.
   * @param {Uint8Array} obj.header - the header data.
   * @param {boolean} obj.decrypt - whether to run in decryption mode.
   */
  constructor({ macKey, aesKey, iv, header, decrypt = false }) {
    if (
      aesKey.byteLength !== KEYSIZE ||
      macKey.byteLength !== KEYSIZE ||
      iv.byteLength !== IVSIZE
    )
      throw new Error('key or nonce wrong size')

    return !decrypt
      ? {
          // encryption transform
          async start(controller) {
            this.iv = new Uint8Array(iv)
            this.aesKey = await _createKey(aesKey)

            // start an incremental HMAC with SHA-3 which is just H(k || m = (header || payload))
            this.hash = await createSHA3(256)
            this.hash.update(macKey)
            this.hash.update(header)

            controller.enqueue(header)
            this.totalHashingTime = 0.0
            this.totalEncryptionTime = 0.0
          },
          async transform(chunk, controller) {
            const blocks = Math.ceil(chunk.byteLength / BLOCKSIZE)

            // encryption mode: encrypt-then-mac
            var t0 = performance.now()
            const ct = await window.crypto.subtle.encrypt(
              _paramSpec(this.iv),
              this.aesKey,
              chunk
            )
            const tEncrypt = performance.now() - t0
            this.totalEncryptionTime += tEncrypt
            const ctUint8Array = new Uint8Array(ct)
            t0 = performance.now()
            this.hash.update(ctUint8Array)
            const tHash = performance.now() - t0
            this.totalHashingTime += tHash

            controller.enqueue(ctUint8Array)

            // Update the counter
            var view = new DataView(this.iv.buffer)
            var value = view.getBigUint64(NONCESIZE, false)
            value += BigInt(blocks)
            view.setBigUint64(NONCESIZE, value, false)
          },
          async flush(controller) {
            const tag = this.hash.digest()
            controller.enqueue(new Uint8Array(Buffer.from(tag, 'hex')))
            console.log('produced tag: ', tag)
            console.log(
              'total time spent encrypting: ',
              this.totalEncryptionTime
            )
            console.log('total time spent hashing: ', this.totalHashingTime)
          },
        }
      : {
          // decryption transform
          async start(controller) {
            this.iv = new Uint8Array(iv)
            this.aesKey = await _createKey(aesKey)

            // start an incremental HMAC with SHA-3 which is just H(k || m = (header || payload))
            this.hash = await createSHA3(256)
            this.hash.update(macKey)
            this.hash.update(header)

            // for decryption we need some extra bookkeeping
            // keep track of the previous ct and iv and the last
            // 32 bytes seen in the ciphertext stream
            this.previousCt = this.previousIv = undefined
            this.tag = undefined
            // true if the tag was split among the last two blocks
            this.tagSplit = false
          },
          async transform(chunk, controller) {
            const blocks = Math.ceil(chunk.byteLength / BLOCKSIZE)

            if (chunk.byteLength >= TAGSIZE) {
              // the tag was not in the previous ciphertext block
              // it's safe to process it now
              // i.e. mac-then-decrypt
              if (this.previousCt?.byteLength > 0) {
                this.hash.update(this.previousCt)
                const plain = await window.crypto.subtle.decrypt(
                  _paramSpec(this.previousIv),
                  this.aesKey,
                  this.previousCt
                )
                controller.enqueue(new Uint8Array(plain))
              }
            } else {
              // edge case: tag is split across last two blocks
              // we set the tag and previousCt here otherwise going
              // to the next round forgets this data
              this.tagSplit = true
              const tagBytesInPrevious = TAGSIZE - chunk.byteLength
              this.tag = [
                ...this.previousCt.slice(-tagBytesInPrevious),
                ...chunk,
              ]
              this.previousCt = this.previousCt.slice(0, -tagBytesInPrevious)
            }

            // prepare for next round
            this.previousCt = chunk
            this.previousIv = new Uint8Array(this.iv)

            // Update the counter
            var view = new DataView(this.iv.buffer)
            var value = view.getBigUint64(NONCESIZE, false)
            value += BigInt(blocks)
            view.setBigUint64(NONCESIZE, value, false)
          },
          async flush(controller) {
            if (!this.tagSplit) {
              // the tag was in the final block
              this.tag = this.previousCt.slice(-TAGSIZE)
              this.previousCt = this.previousCt.slice(0, -TAGSIZE)
            }
            if (this.previousCt?.byteLength > 0) {
              this.hash.update(this.previousCt)
              const plain = await window.crypto.subtle.decrypt(
                _paramSpec(this.previousIv),
                this.aesKey,
                this.previousCt
              )
              controller.enqueue(new Uint8Array(plain))
            }
            const found = Buffer.from(this.tag).toString('hex')
            const tag = this.hash.digest()
            console.log('tag found in stream: ', found)
            console.log('produced tag: ', tag)
            if (found.normalize() != tag.normalize())
              controller.error(new Error('tags do not match'))
          },
        }
  }
}

module.exports = {
  Sealer,
  Chunker,
  chunkedFileStream,
}
