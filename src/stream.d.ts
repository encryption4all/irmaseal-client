/**
 * SealTransform, class of which instances can be used as parameter
 * to new Transform.
 */
export class Sealer {
    /**
     * Constructs a new intsance of SealTransform.
     * @param {Object} obj - SealTransform options.
     * @param {Uint8Array} obj.macKey - the MAC key.
     * @param {Uint8Array} obj.aesKey - the AES encryption key.
     * @param {Uint8Array} obj.iv - the initialization vector (including 64-bit BE counter) for encryption.
     * @param {Uint8Array} obj.header - the header data.
     * @param {boolean} obj.decrypt - whether to run in decryption mode.
     */
    constructor({ macKey, aesKey, iv, header, decrypt }: {
        macKey: Uint8Array;
        aesKey: Uint8Array;
        iv: Uint8Array;
        header: Uint8Array;
        decrypt: boolean;
    });
}
/**
 * Transforms streams with randomly sized chunked
 * to a stream of chunks containing atleast chunkSize bytes.
 * Only the last chunk is of smaller size.
 * TODO: do not use! There's still a bug in there...
 */
export class Chunker {
    /**
     * Constructs a new chunker.
     * @param {object} obj - the chunker options.
     * @param {number} obj.chunkSize - the desired internal buffer, in bytes.
     * @param {number} [obj.offset] - how many bytes to discard of the incoming stream.
     */
    constructor({ offset, chunkSize }: {
        chunkSize: number;
        offset?: number;
    });
}
/**
 * Creates a ReadableStream that tries to take DEFAULT_CHUNK_SIZE bytes
 * of data from the underlying sink till the sink is exhausted.
 * @param {File} file - file source to read from.
 * @param {number} chunkSize - the desired internal buffer.
 */
export function chunkedFileStream(file: File, { offset, chunkSize }: number): ReadableStream<any>;
