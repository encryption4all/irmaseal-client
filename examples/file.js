import 'web-streams-polyfill'

import { Sealer, Chunker, chunkedFileStream } from './../dist/irmaseal-client'

import {
  createReadableStreamWrapper,
  createWritableStreamWrapper,
} from '@mattiasbuelens/web-streams-adapter'

import { createWriteStream } from 'streamsaver'

// Wrappers for native stream implementations
const toReadable = createReadableStreamWrapper(ReadableStream)
const toWritable = createWritableStreamWrapper(WritableStream)

//const macKey = window.crypto.getRandomValues(new Uint8Array(32))
//const aesKey = window.crypto.getRandomValues(new Uint8Array(32))
//const nonce = window.crypto.getRandomValues(new Uint8Array(12))

const aesKey = new Uint8Array([229,113,154,254,224,194,12,223,89,248,13,158,61,7,115,110,114,71,99,14,11,108,233,120,149,170,106,130,61,62,234,33])
const macKey = new Uint8Array([18,22,47,8,204,101,2,134,60,23,136,89,235,32,125,119,238,48,230,211,130,79,118,183,155,225,170,71,24,150,219,96])
const nonce = new Uint8Array([156,7,105,42,142,152,226,200,127,190,246,59])

console.log(
  `encrypting using\nkey = ${aesKey}\nmackey = ${macKey}\nnonce = ${nonce}`
)

const listener = async (event) => {
  const decrypt = event.srcElement.classList.contains('decrypt')
  const [inFile] = event.srcElement.files

  // Suggestion for a filename
  const outFileName = decrypt
    ? inFile.name.replace('.enc', '')
    : `${inFile.name}.enc`

  const outStream = createWriteStream(outFileName, {
    size: inFile.size,
    //    size: decrypt ? inFile.size - 32 : inFile.size + 32,
  })

  const writer = toWritable(outStream)
  const readableStream = toReadable(chunkedFileStream(inFile))
  //  const readableStream = toReadable(inFile.stream())

  const t0 = performance.now()

  await readableStream
    //  .pipeThrough(new TransformStream(new Chunker(1024 * 1024)))
    .pipeThrough(
      new TransformStream(
        new Sealer({
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
