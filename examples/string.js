import { KeySorts, fetchKey, PKG_URL } from './utils'

import { PolyfilledWritableStream } from 'web-streams-polyfill'

if (window.WritableStream == undefined) {
    window.WritableStream = PolyfilledWritableStream
}

window.onload = async () => {
    const mod = await import('@e4a/pg-wasm')
    console.log('loaded WASM module')

    const mpk = await fetch(`${PKG_URL}/v2/parameters`)
        .then((r) => r.json())
        .then((j) => j.publicKey)

    console.log('retrieved public key: ', mpk)

    // This example uses demo credentials.
    // Anyone get retrieve an instance with custom data at the following URL:
    // https://privacybydesign.foundation/attribute-index/en/irma-demo.gemeente.personalData.html

    const enc_policy = {
        Bob: {
            ts: Math.round(Date.now() / 1000),
            con: [{ t: 'irma-demo.sidn-pbdf.email.email', v: 'bob@example.com' }],
        },
    }

    const pub_sig_policy = {
        con: [{ t: 'irma-demo.gemeente.personalData.fullname', v: 'Alice' }],
    }

    const priv_sig_policy = {
        con: [{ t: 'irma-demo.gemeente.personalData.bsn', v: '1234' }],
    }

    console.log('retrieving signing key for Alice')

    let pub_sign_key = await fetchKey(KeySorts.Signing, pub_sig_policy)
    let priv_sign_key = await fetchKey(KeySorts.Signing, priv_sig_policy)

    console.log('got public signing key for Alice: ', pub_sign_key)
    console.log('got private signing key for Alice: ', priv_sign_key)

    const sealOptions = {
        policy: enc_policy,
        pub_sign_key,
        priv_sign_key,
    }

    console.log(
        `Encrypting using policy: \n${enc_policy} and signing using:\n ${pub_sig_policy} and ${pub_sig_policy}`
    )

    const input = 'plaintext'

    const sealerReadable = new ReadableStream({
        start: (controller) => {
            const encoded = new TextEncoder().encode(input)
            controller.enqueue(encoded)
            controller.close()
        },
    })

    let output = new Uint8Array(0)
    const sealerWritable = new WritableStream({
        write: (chunk) => {
            output = new Uint8Array([...output, ...chunk])
        },
    })

    const t0 = performance.now()

    try {
        await mod.seal(mpk, sealOptions, sealerReadable, sealerWritable)
    } catch (e) {
        console.log('error during sealing: ', e)
    }

    const tEncrypt = performance.now() - t0

    console.log(`tEncrypt ${tEncrypt}$ ms`)

    /// Decryption
    const vk = await fetch(`${PKG_URL}/v2/sign/parameters`)
        .then((r) => r.json())
        .then((j) => j.publicKey)

    console.log('retrieved verification key: ', vk)

    const unsealerReadable = new ReadableStream({
        start: (controller) => {
            controller.enqueue(output)
            controller.close()
        },
    })

    let original = ''
    const unsealerWritable = new WritableStream({
        write: (chunk) => {
            original += new TextDecoder().decode(chunk)
        },
    })

    try {
        const unsealer = await mod.Unsealer.new(unsealerReadable, vk)
        const header = unsealer.inspect_header()
        console.log('header contains the following recipients: ', header)

        const keyRequest = {
            con: [{ t: 'irma-demo.sidn-pbdf.email.email', v: 'bob@example.com' }],
            validity: 600, // 1 minute
        }

        const timestamp = header.get('Bob').ts
        const usk = await fetchKey(KeySorts.Encryption, keyRequest, timestamp)

        console.log('retrieved usk: ', usk)
        const t0 = performance.now()

        const verified_sender = await unsealer.unseal('Bob', usk, unsealerWritable)

        console.log('original: ', original)
        console.log('signed: ', verified_sender)

        const tDecrypt = performance.now() - t0

        console.log(`tDecrypt ${tDecrypt}$ ms`)
    } catch (e) {
        console.log('error during unsealing: ', e)
    }
}
