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
     * @param {Uint8Array} obj.nonce - the nonce for encryption.
     * @param {boolean} obj.decrypt - whether to run in decryption mode.
     */
    constructor({ macKey, aesKey, nonce, decrypt }: {
        macKey: Uint8Array;
        aesKey: Uint8Array;
        nonce: Uint8Array;
        decrypt: boolean;
    });
}
/**
 * Transforms streams with randomly sized chunked
 * to a stream of chunks containing atleast desiredChunkSize bytes.
 * Only the last chunk is of smaller size.
 */
export class Chunker {
    /**
     * Constructs a new chunker.
     * @param {object} obj - the chunker options.
     * @param {number} obj.desiredChunkSize - the desired internal buffer, in bytes.
     */
    constructor({ desiredChunkSize }: {
        desiredChunkSize: number;
    });
}
/**
 * Creates a ReadableStream that tries to take DEFAULT_CHUNK_SIZE bytes
 * of data from the underlying sink till the sink is exhausted.
 * @param {File} file - file sink to read from.
 * @param {number} desiredChunkSize - the desired internal buffer.
 */
export function chunkedFileStream(file: File, desiredChunkSize?: number): ReadableStream<any>;
