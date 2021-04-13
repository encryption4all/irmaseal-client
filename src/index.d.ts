export type Attribute = {
    /**
     * - attribute type.
     */
    type: string;
    /**
     * - attribute value.
     */
    value?: string;
};
/**
 * @typedef {Object} Attribute
 * @property {string} type - attribute type.
 * @property {string} [value] - attribute value.
 */
export class Client {
    /**
     * Creates a new client to interact with a PKG at the given url.
     * @param {String} url - url of the PKG with which the client connects, required.
     * @param {Boolean} [loadModule=true] - indicates whether the client will do bytestream operation, optional.
     * @param {Object} [localStorage], localStorage API object, optional.
     * @returns {Promise<Client>} client, an initialized client.
     */
    static build(url: string, loadModule?: boolean, localStorage?: any): Promise<Client>;
    /**
     * Do not use. Use Client.build() instead.
     * @constructor
     * @param {String} url, url of the PKG.
     * @param {String} params, parameters received from /parameters of PKG.
     * @param {Object} module, the imported WASM module.
     */
    constructor(url: string, params: string, module: any, localStorage: any);
    url: string;
    params: string;
    module: any;
    localStorage: any;
    /**
     * Loads the WASM module.
     * Needs to be run before calling either extractIdentity, encrypt or decrypt.
     */
    loadModule(): Promise<void>;
    /**
     * Returns the identity enclosed in the bytestream (including timestamp)
     * @param {Uint8Array} irmasealBytestream
     * @returns {Object} identity
     */
    extractIdentity(irmasealBytestream: Uint8Array): any;
    /**
     *
     * @param {Attribute}, singleton attribute identity to encrypt for.
     * @param {Object} plaintextObject, the object to encrypt.
     * @returns {Uint8Array} ciphertext.
     */
    encrypt(attribute: any, plaintextObject: any): Uint8Array;
    /**
     * Decrypts the irmasealBytestream using the user secret key (USK).
     * @param {String} usk, user secret key.
     * @param {Uint8Array} irmasealBytestream,
     * @returns {Object}, plaintext object.
     */
    decrypt(usk: string, irmasealBytestream: Uint8Array): any;
    /**
     * Requests a session token for an IRMA identity at the PKG.
     * @param {Attribute}, attribute to retrieve session token for.
     * @return {Promise<String>} session token.
     */
    _requestToken(attribute: any): Promise<string>;
    /**
     * Request a user private key from the PKG using a session token and timestamp.
     * @param {String} token, the session token.
     * @param {Number} timestamp, the UNIX timestamp.
     * @returns {Promise<String>}, user private key.
     */
    requestKey(token: string, timestamp: number): Promise<string>;
    /**
     * Retrieves a session token for a given identity given by a single attribute { type, value }.
     * Uses the localStorage passed to client.build() as a cache otherwise a new token is requested at the PKG.
     * @param {Attribute} attribute.
     * @returns {Promise<String>}, a promise of a token.
     */
    requestToken(attribute: any): Promise<string>;
}
