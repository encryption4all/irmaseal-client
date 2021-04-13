import { Client } from './../dist/irmaseal-client.js'

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

  // The Javascript object to encrypt
  let some_object = {
    some: 'object',
  }

  // Encrypt the object
  console.log('encrypting some object:', some_object)
  var t0 = performance.now()
  let ct = client.encrypt(identity, some_object)
  var t_encrypt = performance.now() - t0
  console.log('ct:', ct)
  console.log(`t_encrypt: ${t_encrypt} ms`)

  // Retrieve the timestamp from the identity in the IRMAseal bytestream
  let retrievedIdentity = client.extractIdentity(ct)
  let timestamp = retrievedIdentity.timestamp

  // Request a token for for the identity
  console.log('requesting token')

  client.requestToken(identity).then((token) => {
    // Use token to get a key for a specific timestamp
    client.requestKey(token, timestamp).then((key) => {
      t0 = performance.now()
      let plain = client.decrypt(key, ct)
      var t_decrypt = performance.now() - t0
      console.log('decrypted plaintext: ', plain)
      console.log(`t_decrypt: ${t_decrypt} ms`)
    })
  })
}
