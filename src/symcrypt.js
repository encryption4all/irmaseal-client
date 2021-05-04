const { Sealer } = require('./stream')

/**
 * Symmetrical encryption.
 * @param {KeySet} keys - key set to encrypt/decrypt with.
 * @param {Uint8Array} iv - initialization vector including counter.
 * @param {Uint8Array} header - the IRMAseal header data.
 * @param {Uint8Array} input - plaintext in encryption mode or ciphertext in decryption mode.
 * @return {Uint8Array} - vice versa as above.
 * when encrypting:
 * out = header || ct || tag
 * where ct = enc (k_aes, in)
 * and tag = H ( k_mac || header || ct )
 * when decrypting:
 * out = dec(k_aes, ct)
 * tag_1 = H (k_mac || header || ct)
 * tag_2 = tag from ciphertext
 * Throws error if tags don't match
 */
async function symcrypt(keys, iv, header, input, decrypt = false) {
  const outLen = decrypt
    ? input.byteLength - header.byteLength - 32
    : input.byteLength + header.byteLength + 32

  const out = new ArrayBuffer(outLen)
  // don't decrypt header in decryption mode
  var readerOffset = decrypt ? header.byteLength : 0
  var writerOffset = 0

  await new ReadableStream({
    pull(controller) {
      controller.enqueue(input.slice(readerOffset))
      controller.close()
    },
    type: 'bytes',
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

  return new Uint8Array(out)
}

module.exports = { symcrypt: symcrypt }
