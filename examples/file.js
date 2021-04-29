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

  const outFileName = decrypt
    ? inFile.name.replace('.enc', '')
    : `${inFile.name}.enc`

  const outStream = createWriteStream(outFileName)

  const writer = toWritable(outStream)
  const metadataStream = chunkedFileStream(inFile, 512)

  var header, meta, keys

  if (!decrypt) {
    let attribute = {
      type: 'pbdf.sidn-pbdf.email.email',
      value: 'leon.botros@gmail.com',
    }
    ;({ header, metadata: meta, keys } = client.createMetadata(attribute)) // = MetadataCreateResult
  } else {
    ;({ header, metadata: meta } = await client.extractMetadata(metadataStream)) // = MetadataReaderResult
    let usk = await client
      .requestToken(meta.metadata.identity.attribute)
      .then((token) =>
        client.requestKey(token, meta.metadata.identity.timestamp)
      )
    keys = client.derive_keys(meta, usk)
  }

  // js object metadata from Metadata instance
  const metadata = meta.metadata
  console.log('metadata: ', metadata)
  console.log('aes: ', keys.aes_key)
  console.log('mac: ', keys.mac_key)
  console.log('header: ', header)

  const t0 = performance.now()
  const offset = decrypt ? header.byteLength : 0
  const readableStream = toReadable(chunkedFileStream(inFile, 1 * 1024, offset))

  await readableStream
    // Contains a bug still
    //    .pipeThrough(
    //      new TransformStream(
    //        new Chunker({
    //          desiredChunkSize: 64 * 1024,
    //          ...(decrypt && { offset: meta.header.byteLength }),
    //        })
    //      )
    //    )
    .pipeThrough(
      new TransformStream(
        new Sealer({
          aesKey: keys.aes_key,
          macKey: keys.mac_key,
          nonce: metadata.iv.slice(0, 12),
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
