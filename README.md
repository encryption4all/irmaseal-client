# IRMAseal client

A client that communicaties with a private key generator (PKG) within the IRMAseal IBE model.

This client offers the following functionality:

- (`client.build(url)`) retrieve public parameters from the PKG,
- (`client.encrypt({attributeType, attributeValue}, plaintextObject)`) encrypt javascript `Object` given IRMA identities (type/value pairs) into an IRMAseal bytestream,
- (`client.extractTimestamp(IRMAsealBytestream)`extract the timestamps from IRMAseal bytestreams,
- (`client.requestToken({attributeType, attributeValue})`) request an authentication token from the PKG,
- (`client.requestKey(sessionToken, timestamp)`) requests a user private key from the PKG using the previous token,
- (`client.decrypt(userPrivateKey, IRMAsealByteStream)` decrypts the IRMAseal bytestream into a javascript object.

The main product of this repo is a library `irmaseal-client.js`, which exposes the following functions.
A minified version/bundle of this library is included in the `dist` folder.
