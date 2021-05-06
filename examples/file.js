import 'web-streams-polyfill'

import {
  Client,
  Sealer,
  Chunker,
  chunkedFileStream,
} from './../dist/irmaseal-client'

import {
  createReadableStreamWrapper,
  createWritableStreamWrapper,
} from '@mattiasbuelens/web-streams-adapter'

import { createWriteStream } from 'streamsaver'

// Wrappers for native stream implementations
const toReadable = createReadableStreamWrapper(ReadableStream)
const toWritable = createWritableStreamWrapper(WritableStream)

const listener = async (event) => {
  let client = await Client.build('https://qrona.info/pkg', true, null)

  const decrypt = event.srcElement.classList.contains('decrypt')
  const [inFile] = event.srcElement.files
  const readableStream = chunkedFileStream(inFile)

  var header, meta, keys

  if (!decrypt) {
    let attribute = {
      type: 'pbdf.sidn-pbdf.email.email',
      value: 'leon.botros@gmail.com',
    }
    ;({ header, metadata: meta, keys } = client.createMetadata(attribute)) // = MetadataCreateResult
  } else {
    ;({ header, metadata: meta } = await client.extractMetadata(readableStream)) // = MetadataReaderResult
    let usk = await client
      .requestToken(meta.to_json().identity.attribute)
      .then((token) =>
        client.requestKey(token, meta.to_json().identity.timestamp)
      )
    keys = meta.derive_keys(usk)
  }

  const metadata = meta.to_json()
  console.log('metadata: ', metadata)
  console.log('aes: ', keys.aes_key)
  console.log('mac: ', keys.mac_key)
  console.log('header: ', header)
  const outFileName = decrypt
    ? inFile.name.replace('.enc', '')
    : `${inFile.name}.enc`

  const outStream = createWriteStream(outFileName, {
    size: decrypt
      ? inFile.size - header.byteLength - 32
      : inFile.size + header.byteLength + 32,
  })
  const writer = toWritable(outStream)

  const t0 = performance.now()

  await toReadable(readableStream)
    .pipeThrough(new TransformStream(new Chunker()))
    .pipeThrough(
      new TransformStream(
        new Sealer({
          aesKey: keys.aes_key,
          macKey: keys.mac_key,
          iv: metadata.iv,
          header: header,
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
