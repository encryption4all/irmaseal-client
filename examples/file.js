import * as IrmaCore from '@privacybydesign/irma-core'
import * as IrmaClient from '@privacybydesign/irma-client'
import * as IrmaPopup from '@privacybydesign/irma-popup'
import '@privacybydesign/irma-css'

import { PolyfilledWritableStream } from 'web-streams-polyfill'
import { createWriteStream } from 'streamsaver'

if (window.WritableStream == undefined) {
  window.WritableStream = PolyfilledWritableStream
}

const pkg = 'http://localhost:8087'
var mpk
var mod

const listener = async (event) => {
  const decrypt = event.srcElement.classList.contains('decrypt')
  const [inFile] = event.srcElement.files

  const outFileName = decrypt
    ? inFile.name.replace('.enc', '')
    : `${inFile.name}.enc`
  const fileWritable = createWriteStream(outFileName)

  const readable = inFile.stream()
  const writable = fileWritable

  if (!decrypt) {
    const policies = {
      'l.botros@cs.ru.nl': {
        ts: Math.round(Date.now() / 1000),
        c: [{ t: 'pbdf.gemeente.personalData.fullname', v: 'L. Botros' }],
      },
    }

    console.log('Encrypting file using policies: ', policies)

    const t0 = performance.now()

    try {
      await mod.seal(mpk, policies, readable, writable)
    } catch (e) {
      console.log('error during sealing: ', e)
    }

    const tEncrypt = performance.now() - t0

    console.log(`tEncrypt ${tEncrypt}$ ms`)
    console.log(`average MB/s: ${inFile.size / (1000 * tEncrypt)}`)
  } else {
    try {
      const unsealer = await new mod.Unsealer(readable)
      const hidden = unsealer.get_hidden_policies()
      console.log('hidden policy: ', hidden)

      const rec_id = window.prompt('Please enter your recipient identifier: ')

      // Guess it right, order should not matter
      const irmaIdentity = {
        con: [{ t: 'pbdf.gemeente.personalData.fullname', v: 'L. Botros' }],
      }

      const timestamp = hidden[rec_id].ts

      const session = {
        url: pkg,
        start: {
          url: (o) => `${o.url}/v2/request`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(irmaIdentity),
        },
        result: {
          url: (o, { sessionToken }) =>
            `${o.url}/v2/request/${sessionToken}/${timestamp.toString()}`,
          parseResponse: (r) => {
            return new Promise((resolve, reject) => {
              if (r.status != '200') reject('not ok')
              r.json().then((json) => {
                if (json.status !== 'DONE_VALID') reject('not done and valid')
                resolve(json.key)
              })
            })
          },
        },
      }

      const irma = new IrmaCore({ debugging: true, session })

      irma.use(IrmaClient)
      irma.use(IrmaPopup)

      const usk = await irma.start()
      console.log('retrieved usk: ', usk)

      const t0 = performance.now()

      await unsealer.unseal(rec_id, usk, writable)

      const tDecrypt = performance.now() - t0

      console.log(`tDecrypt ${tDecrypt}$ ms`)
      console.log(`average MB/s: ${inFile.size / (1000 * tDecrypt)}`)
    } catch (e) {
      console.log('error during unsealing: ', e)
    }
  }
}

window.onload = async () => {
  const resp = await fetch(`${pkg}/v2/parameters`)
  mpk = await resp.json().then((r) => r.public_key)

  console.log('retrieved public key: ', mpk)

  mod = await import('@e4a/irmaseal-wasm-bindings')
  console.log('loaded WASM module')

  const buttons = document.querySelectorAll('input')
  buttons.forEach((btn) => btn.addEventListener('change', listener))
}
