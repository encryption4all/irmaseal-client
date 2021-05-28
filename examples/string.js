import 'web-streams-polyfill'
import {
  Client,
  symcrypt,
  createUint8ArrayReadable,
} from './../dist/irmaseal-client.js'

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

  const ct = await symcrypt(meta.keys, metadata.iv, meta.header, bytes)
  console.log('ct :', ct)

  const readable = createUint8ArrayReadable(ct)
  const res = await client.extractMetadata(readable)
  const metadata_retrieved = res.metadata
  const metadata_retrieved_json = metadata_retrieved.to_json()

  console.log('retrieved metadata: ', metadata_retrieved)
  console.log('retrieved header: ', res.header)

  console.log(
    'requesting token for:',
    metadata_retrieved_json.identity.attribute
  )

  const usk = await client
    .requestToken(metadata_retrieved_json.identity.attribute)
    .then((token) =>
      client.requestKey(token, metadata_retrieved_json.identity.timestamp)
    )

  const derived_keys = metadata_retrieved.derive_keys(usk)

  console.log('got usk from pkg: ', usk)

  const plain = await symcrypt(
    derived_keys,
    metadata_retrieved_json.iv,
    res.header,
    ct,
    true
  )

  const string2 = new TextDecoder().decode(plain)
  console.log('decrypted: ', string2)
}
