export class Client {
  /**
   * build.
   * Creates a new client to interact with a PKG at the given url.
   * @param {String} url, url of the PKG with which the client connects.
   * @returns {Promise<Client>} client, an initialized client.
   */
  static build(url: string): Promise<Client>
  /**
   * constructor.
   * Do not use. Use Client.build() instead.
   * @constructor
   * @param {String} url, url of the PKG.
   * @param {String} params, parameters received from /parameters of PKG.
   * @param {Object} module, the imported WASM module.
   */
  constructor(url: string, params: string, module: any)
  url: string
  params: string
  module: any
  /**
   * extractTimestamp.
   * Returns the timestamp included an IRMAseal bytestream.
   * @param {Uint8Array} irmasealBytestream, the ciphertext.
   * @returns {Number} timestamp, UNIX timestamp.
   */
  extractTimestamp(irmasealBytestream: Uint8Array): number
  /**
   * encrypt.
   *
   * @param {{attributeType: String, attributeValue: String}}, identity to encrypt for.
   * @param {Object} plaintextObject, the object to encrypt.
   * @returns {Uint8Array} ciphertext.
   */
  encrypt(
    {
      attributeType,
      attributeValue,
    }: {
      attributeType: string
      attributeValue: string
    },
    plaintextObject: any
  ): Uint8Array
  /**
   * decrypt.
   * Decrypts the irmasealBytestream using the user private key (USK).
   * @param {String} userPrivateKey,
   * @param {Uint8Array} irmasealBytestream,
   * @returns {Object}, plaintext object.
   */
  decrypt(userPrivateKey: string, irmasealBytestream: Uint8Array): any
  /**
   * requestToken.
   * Requests a session token for an IRMA identity.
   * @param {{attributeType: String, attributeValue: String}}, the IRMA identity.
   * @return {Promise<String>} session token.
   */
  requestToken({
    attributeType,
    attributeValue,
  }: {
    attributeType: string
    attributeValue: string
  }): Promise<string>
  /**
   * requestKey.
   * Request a user private key from the PKG using a session token and timestamp.
   * @param {String} token, the session token.
   * @param {Number} timestamp, the UNIX timestamp.
   * @returns {Promise<String>}, user private key.
   */
  requestKey(token: string, timestamp: number): Promise<string>
}
