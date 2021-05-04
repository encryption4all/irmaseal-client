/**
 * Symmetrical encryption.
 * @param {KeySet} keys - key set to encrypt/decrypt with.
 * @param {Uint8Array} iv - initialization vector including counter.
 * @param {Uint8Array} header - the IRMAseal header data.
 * @param {Uint8Array} input - plaintext in encryption mode or ciphertext in decryption mode.
 * @return {Uint8Array} - vice versa as above.
 * when encrypting:
 * out = header || ct || tag
 * where ct = enc (k_aes, in)
 * and tag = H ( k_mac || header || ct )
 * when decrypting:
 * out = dec(k_aes, ct)
 * tag_1 = H (k_mac || header || ct)
 * tag_2 = tag from ciphertext
 * Throws error if tags don't match
 */
export function symcrypt(keys: any, iv: Uint8Array, header: Uint8Array, input: Uint8Array, decrypt?: boolean): Uint8Array;
