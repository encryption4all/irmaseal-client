import 'web-streams-polyfill'
import { Client, CachePlugin } from './../dist/irmaseal-client'

import '@privacybydesign/irma-css'

import * as IrmaCore from '@privacybydesign/irma-core'
import * as IrmaClient from '@privacybydesign/irma-client'
import * as IrmaPopup from '@privacybydesign/irma-popup'

import {
  createReadableStreamWrapper,
  createWritableStreamWrapper,
} from '@mattiasbuelens/web-streams-adapter'

import { createWriteStream } from 'streamsaver'

// Wrappers for native stream implementations
const toReadable = createReadableStreamWrapper(ReadableStream)
const toWritable = createWritableStreamWrapper(WritableStream)

const listener = async (event) => {
  let client = await Client.build('https://irmacrypt.nl/pkg')

  const decrypt = event.srcElement.classList.contains('decrypt')
  const [inFile] = event.srcElement.files
  var readable = client.createFileReadable(inFile)

  var header, meta, keys

  if (!decrypt) {
    let attribute = {
      type: 'pbdf.sidn-pbdf.email.email',
      value: 'leon.botros@gmail.com',
    }
    ;({ header, metadata: meta, keys } = client.createMetadata(attribute)) // = MetadataCreateResult
  } else {
    ;({
      header,
      metadata: meta,
      readable,
    } = await client.extractMetadata(readable)) // = MetadataReaderResult

    const {
      identity: { attribute: irmaIdentity, timestamp: timestamp },
    } = meta.to_json()

    var session = client.createPKGSession(irmaIdentity, timestamp)

    var irma = new IrmaCore({ debugging: true, session: session })
    // Optional:  irma.use(CachePlugin)
    irma.use(IrmaClient)
    irma.use(IrmaPopup)

    const usk = await irma.start()
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

  await toReadable(readable)
    .pipeThrough(
      client.createChunker({ offset: decrypt ? header.byteLength : 0 })
    )
    .pipeThrough(
      client.createTransformStream({
        aesKey: keys.aes_key,
        macKey: keys.mac_key,
        iv: metadata.iv,
        header: header,
        decrypt: decrypt,
      })
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
