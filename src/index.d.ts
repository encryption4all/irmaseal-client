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
     * @param {Object} params, parameters received from /parameters of PKG.
     * @param {Object} module, the imported WASM module.
     * @param {Object} constants, encryption constants from the rust side.
     */
    constructor(url: string, params: any, module: any);
    url: string;
    params: any;
    module: any;
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
        result: {
            url: (o: any, { sessionToken: token }: {
                sessionToken: any;
            }) => string;
            parseResponse: (r: any) => Promise<any>;
        };
    };
}
