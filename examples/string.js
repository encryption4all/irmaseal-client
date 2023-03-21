import { KeySorts, fetchKey, PKG_URL } from './utils'

import { PolyfilledWritableStream } from 'web-streams-polyfill'

if (window.WritableStream == undefined) {
    window.WritableStream = PolyfilledWritableStream
}

// This example uses demo credentials.
// Anyone get retrieve an instance with custom data at the following URL:
// https://privacybydesign.foundation/attribute-index/en/irma-demo.gemeente.personalData.html

const modPromise = import('@e4a/pg-wasm')
let ct

async function encrypt() {
    const input = document.getElementById('plain').value
    console.log('input: ', input)

    const mod = await modPromise
    console.log('loaded WASM module')

    const mpk = await fetch(`${PKG_URL}/v2/parameters`)
        .then((r) => r.json())
        .then((j) => j.publicKey)

    console.log('retrieved public key: ', mpk)

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

    const readable = new ReadableStream({
        start: (controller) => {
            const encoded = new TextEncoder().encode(input)
            controller.enqueue(encoded)
            controller.close()
        },
    })

    let ciphertext = new Uint8Array(0)
    const writable = new WritableStream({
        write: (chunk) => {
            ciphertext = new Uint8Array([...ciphertext, ...chunk])
        },
    })

    const t0 = performance.now()

    try {
        await mod.seal(mpk, sealOptions, readable, writable)
    } catch (e) {
        console.log('error during sealing: ', e)
    }

    const tEncrypt = performance.now() - t0

    console.log(`tEncrypt ${tEncrypt}$ ms`)

    console.log(ciphertext)

    const outputEl = document.getElementById('ciphertext')
    outputEl.value = ciphertext
    ct = ciphertext
}

async function decrypt() {
    const mod = await modPromise

    const vk = await fetch(`${PKG_URL}/v2/sign/parameters`)
        .then((r) => r.json())
        .then((j) => j.publicKey)

    console.log('retrieved verification key: ', vk)

    try {
        const readable = new ReadableStream({
            start: (controller) => {
                controller.enqueue(ct)
                controller.close()
            },
        })

        let output = new Uint8Array(0)
        const writable = new WritableStream({
            write: (chunk) => {
                output = new Uint8Array([...output, ...chunk])
            },
        })

        const unsealer = await mod.Unsealer.new(readable, vk)
        const header = unsealer.inspect_header()
        console.log('header contains the following recipients: ', header)

        const keyRequest = {
            con: [{ t: 'irma-demo.sidn-pbdf.email.email', v: 'bob@example.com' }],
        }

        const timestamp = header.get('Bob').ts
        const usk = await fetchKey(KeySorts.Encryption, keyRequest, timestamp)

        console.log('retrieved usk: ', usk)

        const t0 = performance.now()
        const verified_sender = await unsealer.unseal('Bob', usk, writable)
        const tDecrypt = performance.now() - t0
        console.log(`tDecrypt ${tDecrypt}$ ms`)

        const original = new TextDecoder().decode(output)
        document.getElementById('original').textContent = original
        document.getElementById('sender').textContent = JSON.stringify(verified_sender)
    } catch (e) {
        console.log('error during unsealing: ', e)
    }
}

window.onload = async () => {
    const encBtn = document.getElementById('encrypt-btn')
    encBtn.addEventListener('click', encrypt)

    const decBtn = document.getElementById('decrypt-btn')
    decBtn.addEventListener('click', decrypt)
}
