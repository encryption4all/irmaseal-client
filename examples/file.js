import 'web-streams-polyfill'

import {
  SealTransform,
  makeReadableFileStream,
} from './../dist/irmaseal-client'

import {
  createReadableStreamWrapper,
  createWritableStreamWrapper,
} from '@mattiasbuelens/web-streams-adapter'

import { createWriteStream } from 'streamsaver'

// Wrappers for native stream implementations
const toReadable = createReadableStreamWrapper(ReadableStream)
const toWritable = createWritableStreamWrapper(WritableStream)

const macKey = window.crypto.getRandomValues(new Uint8Array(32))
const aesKey = window.crypto.getRandomValues(new Uint8Array(32))
const nonce = window.crypto.getRandomValues(new Uint8Array(12))

console.log(`encrypting using\nkey = ${aesKey}\nnonce = ${nonce}`)

const listener = async (event) => {
  const decrypt = event.srcElement.classList.contains('decrypt')
  const [inFile] = event.srcElement.files

  // Suggestion for a filename
  const outFileName = decrypt
    ? inFile.name.replace('.enc', '')
    : `${inFile.name}.enc`

  const outStream = createWriteStream(outFileName, {
    size: inFile.size,
  })

  const writer = toWritable(outStream)
  const readableStream = toReadable(makeReadableFileStream(inFile))

  const t0 = performance.now()

  await readableStream
    .pipeThrough(
      new TransformStream(
        new SealTransform({
          macKey: macKey,
          aesKey: aesKey,
          nonce: nonce,
          decrypt: decrypt,
        })
      )
    )
    .pipeTo(writer)

  const tEncrypt = performance.now() - t0

  console.log(`tEncrypt/Decrypt ${tEncrypt}$ ms`)
  console.log(`average MB/s: ${inFile.size / (1000 * tEncrypt)}`)
}

window.onload = async () => {
  const buttons = document.querySelectorAll('input')
  buttons.forEach((btn) => btn.addEventListener('change', listener))
}
