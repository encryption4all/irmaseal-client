export type KeySet = import('@e4a/irmaseal-wasm-bindings').KeySet;
export type Metadata = import('@e4a/irmaseal-wasm-bindings').Metadata;
export type MetadataCreateResult = import('@e4a/irmaseal-wasm-bindings').MetadataCreateResult;
export type MetadataReaderResult = import('@e4a/irmaseal-wasm-bindings').MetadataReaderResult;
/**
 * @typedef {import('@e4a/irmaseal-wasm-bindings').KeySet} KeySet
 * @typedef {import('@e4a/irmaseal-wasm-bindings').Metadata} Metadata
 * @typedef {import('@e4a/irmaseal-wasm-bindings').MetadataCreateResult} MetadataCreateResult
 * @typedef {import('@e4a/irmaseal-wasm-bindings').MetadataReaderResult} MetadataReaderResult
 */

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
     * @static
     * @param {String} url - url of the PKG with which the client connects, required.
     * @param {Object} [localStorage], localStorage API object, optional.
     * @returns {Promise<Client>} client, an initialized client.
     */
    static build(url: string): Promise<Client>;
    /**
     * Do not use. Use Client.build() instead.
     * @constructor
     * @param {String} url, url of the PKG.
     * @param {String} params, parameters received from /parameters of PKG.
     * @param {Object} module, the imported WASM module.
     * @param {Object} constants, encryption constants from the rust side.
     */
    constructor(url: string, params: string, module: any, constants: any);
    url: string;
    params: string;
    module: any;
    constants: any;
    /**
     * Create a new Metadata object.
     * @param {Attribute} attribute.
     * @return {MetadataCreateResult} metadata.
     */
    createMetadata(attribute: any): any;
    /**
     * Extract Metadata from a ReadableStream.
     * Reads the stream no further then needed to extract the metadata.
     * @async
     * @param {ReadableStream} - readablestream.
     * @returns {Promise<Object>} - result.
     * @returns {Metadata} - result.metadata - the Metadata object extracted from the stream.
     * @returns {Uint8Array} - result.header - the raw header bytes.
     */
    extractMetadata(readable: any): Promise<any>;
    createTransformStream(options: any): TransformStream<any, any>;
    createChunker(): Chunker;
    symcrypt(options: any): Promise<Uint8Array>;
    createFileReadable(file: any, options?: {}): ReadableStream<any>;
    createUint8ArrayReadable(array: any, options?: {}): ReadableStream<any>;
    createPKGSession(identity: any, timestamp: any): {
        identity: any;
        timestamp: any;
        maxAge: any;
        url: string;
        start: {
            url: (o: any) => string;
            method: string;
            headers: {
                'Content-Type': string;
            };
            body: string;
        };
        state: {
            serverSentEvents: boolean;
        };
        mapping: {
            sessionPtr: (r: any) => any;
        };
        result: {
            url: (o: any, { sessionToken: token }: {
                sessionToken: any;
            }) => string;
            parseResponse: (r: any) => Promise<any>;
        };
    };
}
import { Chunker } from "./stream";
export { CachePlugin };
