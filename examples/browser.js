import { Client, symcrypt } from './../dist/irmaseal-client.js'

window.onload = async () => {
  // Create a client
  const client = await Client.build('https://qrona.info/pkg')
  console.log('client initialized')

  // Ask for an email address attribute to encrypt under
  var email = window.prompt('Encrypt using email: ', '')

  let identity = {
    type: 'pbdf.sidn-pbdf.email.email',
    value: email,
  }

  const encoder = new TextEncoder()
  let obj = { x: 'test' }
  let string = JSON.stringify(obj)
  let bytes = encoder.encode(string)

  let meta = client.createMetadata(identity)
  let metadata = meta.metadata.to_json()
  console.log('meta.header: ', meta.header)
  console.log('meta.keys: ', meta.keys)
  console.log('meta.metadata: ', metadata)
  console.log('nonce: ', metadata.iv)

  let ct = await symcrypt(
    meta.keys,
    metadata.iv.slice(0, 12),
    meta.header,
    bytes
  )
  console.log('ct :', ct)

  // TODO: get the metadata out of the stream
  // Request a token for for the identity
  console.log('requesting token')

  const usk = await client
    .requestToken(identity)
    .then((token) => client.requestKey(token, metadata.identity.timestamp))

  console.log('got usk from pkg: ', usk)
  let derived_keys = meta.metadata.derive_keys(usk)

  let plain = await symcrypt(
    derived_keys,
    metadata.iv.slice(0, 12),
    meta.header,
    ct,
    true
  )

  const decoder = new TextDecoder()
  let string2 = decoder.decode(plain)
  let obj2 = JSON.parse(string2)

  console.log('decrypted obj: ', obj2)
}
