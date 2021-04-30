const { Sealer } = require('./stream')

/**
 * encrypt.
 * @param {KeySet} keys
 * @param {Uint8Array} in
 * @return {Uint8Array}
 * when encrypting:
 * out (= ct) = header || ct || tag
 * where ct = enc (k_aes || in )
 * and tag = H ( k_mac || header || ct )
 * when decrypting:
 * out (= plain) = dec(k_aes, ct)
 * tag_1 = H (k_mac || header || ct)
 * tag_2 = tag from ciphertext
 * Throws error if tags don't match
 */
async function symcrypt(keys, nonce, header, input, decrypt = false) {
  console.log('input length: ', input.byteLength)
  const outLen = decrypt
    ? input.byteLength - header.byteLength - 32
    : input.byteLength + header.byteLength + 32

  console.log('creating buffer of size: ', outLen)
  const out = new ArrayBuffer(outLen)
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
          nonce: nonce,
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

  console.log(out)
  return new Uint8Array(out)
}

module.exports = { symcrypt: symcrypt }
