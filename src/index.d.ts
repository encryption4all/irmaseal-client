export type KeySet = import('@e4a/irmaseal-wasm-bindings').KeySet;
export type Metadata = import('@e4a/irmaseal-wasm-bindings').Metadata;
export type MetadataCreateResult = import('@e4a/irmaseal-wasm-bindings').MetadataCreateResult;
export type MetadataReaderResult = import('@e4a/irmaseal-wasm-bindings').MetadataReaderResult;
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
 * @typedef {import('@e4a/irmaseal-wasm-bindings').KeySet} KeySet
 * @typedef {import('@e4a/irmaseal-wasm-bindings').Metadata} Metadata
 * @typedef {import('@e4a/irmaseal-wasm-bindings').MetadataCreateResult} MetadataCreateResult
 * @typedef {import('@e4a/irmaseal-wasm-bindings').MetadataReaderResult} MetadataReaderResult
 */
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
     * Create new Metadata.
     * @param {Attribute} attribute.
     * @return {Metadata} metadata.
     */
    createMetadata(attribute: any): Metadata;
    /**
     * Extract Metadata from a ReadableStream.
     * @param {ReadableStream} readable
     * @return {{metadata: Metadata, header: Uint8Array}}
     */
    extractMetadata(readable: ReadableStream): {
        metadata: Metadata;
        header: Uint8Array;
    };
    /**
     * derive_keys.
     *
     * @param {Metadata} metadata
     * @param {string} usk
     */
    derive_keys(metadata: Metadata, usk: string): import("@e4a/irmaseal-wasm-bindings").KeySet;
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
     * Retrieves a session token for a given identity by a single attribute { type, value }.
     * Uses the localStorage passed to client.build() as a cache otherwise a new token is requested at the PKG.
     * @param {Attribute} attribute.
     * @returns {Promise<String>}, a promise of a token.
     */
    requestToken(attribute: any): Promise<string>;
}
import { Sealer } from "./stream";
import { Chunker } from "./stream";
import { chunkedFileStream } from "./stream";
export { Sealer, Chunker, chunkedFileStream };
