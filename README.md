# IRMAseal client

This library is meant to run in the browser to offer the following functionality:

- Communication with a private key generator (PKG) within the IRMAseal IBE model:
  - retrieving public parameters (public key),
  - retrieving an IRMA session token for a session proving the users identity,
  - retrieving a `User Secret Key` for a session given a UNIX timestamp.
  - caching this key material (for a by the PKG specified time) to reduce user interaction (e.g., scanning a QR code).

* Utilities to (un)pack metadata and encryption/decryption results into streams:
  - creating and serializing a new metadata header.
  - deserializing metadata from a bytestream.
  - retrieving symmetrical encryption keys/parameters from metadata.
  - a streaming encryption interface to to encrypt/decrypt any bytestream using keys/parameters from metadata (for example from `fetch`).
  - helper functions to easily encrypt files (`File`) or byte arrays (`Uint8Array`).

## Requirements

This libary depends on `ReadableStream`, `WritableStream` and `TransformStream`. Several browser have not yet implemented the latter.
To be able to use this library, we recommend polyfilling this missing APIs (see, [web-streams-polyfill](https://github.com/MattiasBuelens/web-streams-polyfill)).

## Examples

For a specific example on how to encrypt a string see [examples/string.js](./examples/string.js).
For an example of how to encrypt files, see [examples/file.js](./examples/file.js).
