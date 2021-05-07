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
     * @static
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
     * @async
     */
    loadModule(): Promise<void>;
    /**
     * Create a new Metadata object.
     * @param {Attribute} attribute.
     * @return {MetadataCreateResult} metadata.
     */
    createMetadata(attribute: any): MetadataCreateResult;
    /**
     * Extract Metadata from a ReadableStream.
     * Reads the stream no further then needed to extract the metadata.
     * @async
     * @param {ReadableStream} - readablestream.
     * @returns {Object} - result.
     * @returns {Metadata} - result.metadata - the Metadata object extracted from the stream.
     * @returns {Uint8Array} - result.header - the raw header bytes.
     */
    extractMetadata(readable: any): any;
    /**
     * Requests a session token for an IRMA identity at the PKG.
     * @async
     * @param {Attribute}, attribute to retrieve session token for.
     * @return {Promise<String>} session token.
     */
    _requestToken(attribute: any): Promise<string>;
    /**
     * Retrieves a session token for a given identity by a single attribute { type, value }.
     * Uses the localStorage passed to client.build() as a cache otherwise a new token is requested at the PKG.
     * @async
     * @param {Attribute} attribute.
     * @returns {Promise<String>}, a promise of a token.
     */
    requestToken(attribute: any): Promise<string>;
    /**
     * Request a user private key from the PKG using a session token and timestamp.
     * @param {String} token, the session token.
     * @param {Number} timestamp, the UNIX timestamp.
     * @returns {Promise<String>}, user private key.
     */
    requestKey(token: string, timestamp: number): Promise<string>;
}
import { Sealer } from "./stream";
import { Chunker } from "./stream";
import { symcrypt } from "./util";
import { createFileReadable } from "./util";
import { createUint8ArrayReadable } from "./util";
export { Sealer, Chunker, symcrypt, createFileReadable, createUint8ArrayReadable };
