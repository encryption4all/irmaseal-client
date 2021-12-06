import 'web-streams-polyfill'
import { Client } from './../dist/irmaseal-client'

import '@privacybydesign/irma-css'

import * as IrmaCore from '@privacybydesign/irma-core'
import * as IrmaClient from '@privacybydesign/irma-client'
import * as IrmaPopup from '@privacybydesign/irma-popup'

//import {
//  createReadableStreamWrapper,
//  createWritableStreamWrapper,
//} from '@mattiasbuelens/web-streams-adapter'
//
//import { createWriteStream } from 'streamsaver'
//
//// Wrappers for native stream implementations
//const toReadable = createReadableStreamWrapper(ReadableStream)
//const toWritable = createWritableStreamWrapper(WritableStream)

const listener = async (event) => {
  let client = await Client.build('http://localhost:8087')

  const decrypt = event.srcElement.classList.contains('decrypt')
  const [fileHandle] = await window.showOpenFilePicker()
  //
  const inFile = await fileHandle.getFile()
  const readable = client.createFileReadable(inFile)
  //  const readable = await inFile.stream()

  const options = {
    types: [
      {
        description: 'Output file',
        accept: {
          'application/octet-stream': ['.enc'],
        },
      },
    ],
  }

  const outHandle = await window.showSaveFilePicker(options)
  const writable = await outHandle.createWritable()

  //  const outStream = createWriteStream(outFileName)
  //
  //  const readable = toReadable(inStream);
  //  const writable = toWritable(outStream)

  if (!decrypt) {
    let policies = [
      {
        t: Math.round(Date.now() / 1000),
        c: [{ t: 'pbdf.sidn-pbdf.email.email', v: 'leon.botros@gmail.com' }],
      },
    ]

    let identifiers = ['l.botros@cs.ru.nl']
    let identifiers_str = JSON.stringify(identifiers)
    let policy_str = JSON.stringify(policies)
    let pk_str = JSON.stringify(client.params.public_key)

    console.log(pk_str)
    console.log(identifiers_str)
    console.log(policy_str)

    const t0 = performance.now()

    await client.module.seal(
      pk_str,
      identifiers_str,
      policy_str,
      readable,
      writable
    )

    const tEncrypt = performance.now() - t0

    console.log(`tEncrypt/Decrypt ${tEncrypt}$ ms`)
    console.log(`average MB/s: ${inFile.size / (1000 * tEncrypt)}`)
  } else {
    var session = client.createPKGSession(irmaIdentity, timestamp)

    var irma = new IrmaCore({ debugging: true, session })
    // Optional:  irma.use(CachePlugin)
    irma.use(IrmaClient)
    irma.use(IrmaPopup)

    const usk = await irma.start()
    console.log('got key: ', usk)
  }
}

window.onload = async () => {
  const buttons = document.querySelectorAll('button')
  buttons.forEach((btn) => btn.addEventListener('click', listener))
}
