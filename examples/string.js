import 'web-streams-polyfill'
import { Client, CachePlugin } from './../dist/irmaseal-client.js'

import '@privacybydesign/irma-css'

import * as IrmaCore from '@privacybydesign/irma-core'
import * as IrmaClient from '@privacybydesign/irma-client'
import * as IrmaPopup from '@privacybydesign/irma-popup'

window.onload = async () => {
  // Create a client
  const client = await Client.build('https://irmacrypt.nl/pkg')
  console.log('client initialized')

  // Ask for an email address attribute to encrypt under
  const email = window.prompt('Encrypt using email: ', '')

  const identity = {
    type: 'pbdf.sidn-pbdf.email.email',
    value: email,
  }

  const string = 'hello'
  const bytes = new TextEncoder().encode(string)

  const meta = client.createMetadata(identity)
  const metadata = meta.metadata.to_json()
  console.log('meta.header: ', meta.header)
  console.log('meta.keys: ', meta.keys)
  console.log('meta.metadata: ', metadata)
  console.log('nonce: ', metadata.iv)

  const ct = await client.symcrypt({
    keys: meta.keys,
    iv: metadata.iv,
    header: meta.header,
    input: bytes,
  })
  console.log('ct :', ct)

  const readable = client.createUint8ArrayReadable(ct)
  const res = await client.extractMetadata(readable)
  const metadata_retrieved = res.metadata
  const metadata_retrieved_json = metadata_retrieved.to_json()

  console.log('retrieved metadata: ', metadata_retrieved)
  console.log('retrieved header: ', res.header)

  console.log(
    'requesting token for:',
    metadata_retrieved_json.identity.attribute
  )

  var session = client.createPKGSession(
    metadata_retrieved_json.identity.attribute,
    metadata_retrieved_json.identity.timestamp
  )

  console.log('session: ', session)

  var irma = new IrmaCore({ debugging: true, session: session })
  irma.use(CachePlugin)
  irma.use(IrmaClient)
  irma.use(IrmaPopup)

  const usk = await irma.start()
  console.log('got usk from pkg: ', usk)

  const derived_keys = metadata_retrieved.derive_keys(usk)

  const plain = await client.symcrypt({
    keys: derived_keys,
    iv: metadata_retrieved_json.iv,
    header: res.header,
    input: ct,
    decrypt: true,
  })

  const string2 = new TextDecoder().decode(plain)
  console.log('decrypted: ', string2)
}
