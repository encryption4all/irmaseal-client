/**
 * Helper function for probably the most common usage of this library,
 * i.e., to encrypt a string.
 * In encryption mode:
 * out = header || ct || tag
 * where ct = enc (k_aes, in)
 * and tag = H ( k_mac || header || ct )
 * In decryption mode:
 * (ct, tag_1) = input (split the input)
 * out = dec(k_aes, ct)
 * tag_2 = H (k_mac || header || ct)
 * @async
 * @param {KeySet} keys - key set to encrypt/decrypt with.
 * @param {Uint8Array} iv - initialization vector including counter.
 * @param {Uint8Array} header - the IRMAseal header data.
 * @param {Uint8Array} input - plaintext in encryption mode or ciphertext in decryption mode.
 * @return {Promise<Uint8Array>} - vice versa as above.
 * @throws {Error} if the tags do not match.
 */
export function symcrypt({ keys, iv, header, input, decrypt }: any): Promise<Uint8Array>;
/**
 * Creates a ReadableStream of bytes from a Uint8Array.
 * @param {Uint8Array} array.
 * @param {number} offset.
 * @return {ReadableStream}.
 */
export function createUint8ArrayReadable(array: any, { offset }: number): ReadableStream;
/**
 * Creates a ReadableStream that reponds to BYOB requests from a file.
 * @param {File} file - file source to read from.
 * @param {number} offset.
 * @return {ReadableStream}.
 */
export function createFileReadable(file: File, { offset }: number): ReadableStream;
