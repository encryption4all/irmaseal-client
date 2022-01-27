import 'web-streams-polyfill'
import { Client } from './../dist/irmaseal-client'

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
  let client = await Client.build('http://localhost:8087')

  const decrypt = event.srcElement.classList.contains('decrypt')
  const [inFile] = event.srcElement.files

  var readable = client.createFileReadable(inFile)

  const outFileName = decrypt
    ? inFile.name.replace('.enc', '')
    : `${inFile.name}.enc`
  const outStream = createWriteStream(outFileName)

  readable = toReadable(readable)
  const writable = toWritable(outStream)

  if (!decrypt) {
    const policies = {
      'l.botros@cs.ru.nl': {
        t: Math.round(Date.now() / 1000),
        c: [
          { t: 'pbdf.sidn-pbdf.email.email', v: 'l.botros@cs.ru.nl' },
          { t: 'pbdf.gemeente.personalData.fullname', v: 'L. Botros' },
          { t: 'pbdf.gemeente.personalData.over18', v: 'Yes' },
        ],
      },
    }

    console.log('public key: ', client.params.public_key)
    console.log('policies: ', policies)

    const t0 = performance.now()

    await client.module.seal(
      client.params.public_key,
      policies,
      readable,
      writable
    )

    const tEncrypt = performance.now() - t0

    console.log(`tEncrypt ${tEncrypt}$ ms`)
    console.log(`average MB/s: ${inFile.size / (1000 * tEncrypt)}`)
  } else {
    const rec_id = window.prompt('Please enter your recipient identifier: ')
    let unsealer = await new client.module.Unsealer(readable, rec_id)
    let hidden = unsealer.get_hidden_policy()
    console.log('hidden policy: ', hidden)

    const header = unsealer.get_raw_header()
    console.log('raw header: ', header)

    // Guess it right, order should not matter
    let irmaIdentity = {
      con: [
        { t: 'pbdf.sidn-pbdf.email.email', v: 'l.botros@cs.ru.nl' },
        { t: 'pbdf.gemeente.personalData.over18', v: 'Yes' },
        { t: 'pbdf.gemeente.personalData.fullname', v: 'L. Botros' },
      ],
    }
    var session = client.createPKGSession(irmaIdentity, hidden.t)
    var irma = new IrmaCore({ debugging: true, session })

    // Optional: irma.use(CachePlugin)
    irma.use(IrmaClient)
    irma.use(IrmaPopup)

    const usk = await irma.start()

    const t0 = performance.now()

    await unsealer.unseal(usk, writable)
    
    const tDecrypt = performance.now() - t0

    console.log(`tDecrypt ${tDecrypt}$ ms`)
    console.log(`average MB/s: ${inFile.size / (1000 * tDecrypt)}`)
  }
}

window.onload = async () => {
  const buttons = document.querySelectorAll('input')
  buttons.forEach((btn) => btn.addEventListener('change', listener))
}
