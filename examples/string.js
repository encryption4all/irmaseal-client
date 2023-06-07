import { KeySorts, fetchKey, PKG_URL } from './utils'

// This example uses demo credentials.
// Anyone get retrieve an instance with custom data at the following URL:
// https://privacybydesign.foundation/attribute-index/en/irma-demo.gemeente.personalData.html

const modPromise = import('@e4a/pg-wasm')
let ct

async function encrypt() {
    const input = document.getElementById('plain').value
    console.log('input: ', input)

    const { seal } = await modPromise
    console.log('loaded WASM module: ', seal)

    const mpk = await fetch(`${PKG_URL}/v2/parameters`)
        .then((r) => r.json())
        .then((j) => j.publicKey)

    console.log('retrieved public key: ', mpk)

    const policy = {
        Bob: {
            ts: Math.round(Date.now() / 1000),
            con: [{ t: 'irma-demo.sidn-pbdf.email.email', v: 'bob@example.com' }],
        },
    }

    const pubSignPolicy = {
        con: [{ t: 'irma-demo.gemeente.personalData.fullname', v: 'Alice' }],
    }

    const privSignPolicy = {
        con: [{ t: 'irma-demo.gemeente.personalData.bsn', v: '1234' }],
    }

    console.log('retrieving signing key for Alice')

    let pubSignKey = await fetchKey(KeySorts.Signing, pubSignPolicy)
    let privSignKey = await fetchKey(KeySorts.Signing, privSignPolicy)

    console.log('got public signing key for Alice: ', pubSignKey)
    console.log('got private signing key for Alice: ', privSignKey)

    const sealOptions = {
        policy,
        pubSignKey,
        privSignKey,
    }

    const encoded = new TextEncoder().encode(input)
    const t0 = performance.now()

    try {
        ct = await seal(mpk, sealOptions, encoded)
        const tEncrypt = performance.now() - t0

        console.log(`tEncrypt ${tEncrypt}$ ms`)
        console.log('ct: ', ct)

        const outputEl = document.getElementById('ciphertext')
        outputEl.value = ct
    } catch (e) {
        console.log('error during sealing: ', e)
    }
}

async function decrypt() {
    const { Unsealer } = await modPromise

    const vk = await fetch(`${PKG_URL}/v2/sign/parameters`)
        .then((r) => r.json())
        .then((j) => j.publicKey)

    console.log('retrieved verification key: ', vk)

    try {
        const unsealer = await Unsealer.new(ct, vk)
        const header = unsealer.inspect_header()
        console.log('header contains the following recipients: ', header)
        const sender = unsealer.public_identity()
        console.log('the header was signed using: ', sender)

        const keyRequest = {
            con: [{ t: 'irma-demo.sidn-pbdf.email.email', v: 'bob@example.com' }],
        }

        const timestamp = header.get('Bob').ts
        const usk = await fetchKey(KeySorts.Encryption, keyRequest, timestamp)

        console.log('retrieved usk: ', usk)

        const t0 = performance.now()
        const [plain, policy] = await unsealer.unseal('Bob', usk)

        const tDecrypt = performance.now() - t0

        console.log(`tDecrypt ${tDecrypt}$ ms`)

        const original = new TextDecoder().decode(plain)
        document.getElementById('original').textContent = original
        document.getElementById('sender').textContent = JSON.stringify(policy)
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
