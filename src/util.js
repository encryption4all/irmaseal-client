const { Sealer, DEFAULT_CHUNK_SIZE, TAGSIZE } = require('./stream')

/**
 * Helper function for probably the most common usage of this library,
 * i.e., to encrypt a string.
 * In encryption mode:
 * out = header || ct || tag
 * where ct = enc (k_aes, in)
 * and tag = H ( k_mac || header || ct )
 * In decryption mode:
 * (ct, tag_1) = input (split the input)
 * out = dec(k_aes, ct)
 * tag_2 = H (k_mac || header || ct)
 * @async
 * @param {KeySet} keys - key set to encrypt/decrypt with.
 * @param {Uint8Array} iv - initialization vector including counter.
 * @param {Uint8Array} header - the IRMAseal header data.
 * @param {Uint8Array} input - plaintext in encryption mode or ciphertext in decryption mode.
 * @return {Promise<Uint8Array>} - vice versa as above.
 * @throws {Error} if the tags do not match.
 */
async function symcrypt(keys, iv, header, input, decrypt = false) {
  const outLen = decrypt
    ? input.byteLength - header.byteLength - TAGSIZE
    : input.byteLength + header.byteLength + TAGSIZE

  const out = new ArrayBuffer(outLen)

  // don't decrypt header
  var readerOffset = decrypt ? header.byteLength : 0
  var writerOffset = 0

  await new ReadableStream({
    pull(controller) {
      controller.enqueue(input.slice(readerOffset))
      controller.close()
    },
  })
    .pipeThrough(
      new TransformStream(
        new Sealer({
          aesKey: keys.aes_key,
          macKey: keys.mac_key,
          iv: iv,
          header,
          decrypt,
        })
      )
    )
    .pipeTo(
      new WritableStream({
        write(chunk, controller) {
          new Uint8Array(out).set(chunk, writerOffset)
          writerOffset += chunk.byteLength
        },
      })
    )

  return new Uint8Array(out, 0, writerOffset)
}

/**
 * Creates a ReadableStream that reponds to BYOB requests from a file.
 * @param {File} file - file source to read from.
 * @param {number} offset.
 * @return {ReadableStream}.
 */
function createFileReadable(file, offset = 0) {
  return new ReadableStream({
    type: 'bytes',
    autoAllocateChunkSize: DEFAULT_CHUNK_SIZE,
    async pull(controller) {
      const view = controller.byobRequest.view
      const read = await file
        .slice(offset, offset + view.byteLength)
        .arrayBuffer()
      view.set(new Uint8Array(read), 0, read.byteLength)
      if (read.byteLength === 0) return controller.close()
      offset += read.byteLength
      controller.byobRequest.respond(read.byteLength)
    },
  })
}

/**
 * Creates a ReadableStream of bytes from a Uint8Array.
 * @param {Uint8Array} array.
 * @param {number} offset.
 * @return {ReadableStream}.
 */
function createUint8ArrayReadable(array, offset = 0) {
  return new ReadableStream({
    type: 'bytes',
    autoAllocateChunkSize: DEFAULT_CHUNK_SIZE,
    pull(controller) {
      const view = controller.byobRequest.view
      const slice = array.slice(offset, offset + view.byteLength)
      view.set(slice, 0, slice.byteLength)
      if (slice.byteLength === 0) return controller.close()
      offset += slice.byteLength
      controller.byobRequest.respond(slice.byteLength)
    },
  })
}

module.exports = { symcrypt, createUint8ArrayReadable, createFileReadable }
