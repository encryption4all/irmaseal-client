import { KeySorts, fetchKey, PKG_URL } from './utils'
import { PolyfilledWritableStream } from 'web-streams-polyfill'
import { createWriteStream } from 'streamsaver'

if (window.WritableStream == undefined) {
    window.WritableStream = PolyfilledWritableStream
}

// This example uses a demo credential.
// Anyone get retrieve an instance with custom data at the following URL:
// https://privacybydesign.foundation/attribute-index/en/irma-demo.gemeente.personalData.html

const modPromise = import('@e4a/pg-wasm')

async function encryptFile(readable, writable) {
    const { sealStream } = await modPromise

    const resp = await fetch(`${PKG_URL}/v2/parameters`)
    const mpk = await resp.json().then((r) => r.publicKey)

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

    try {
        await sealStream(mpk, sealOptions, readable, writable)
    } catch (e) {
        console.log('error during sealing: ', e)
    }
}

async function decryptFile(readable, writable) {
    const { StreamUnsealer } = await modPromise

    const vk = await fetch(`${PKG_URL}/v2/sign/parameters`)
        .then((r) => r.json())
        .then((j) => j.publicKey)

    console.log('retrieved verification key: ', vk)

    const unsealer = await StreamUnsealer.new(readable, vk)
    const recipients = unsealer.inspect_header()
    console.log('header contains the following recipients', recipients)

    const keyRequest = {
        con: [{ t: 'irma-demo.sidn-pbdf.email.email', v: 'bob@example.com' }],
        validity: 600, // 1 minute
    }

    const timestamp = recipients.get('Bob').ts
    const usk = await fetchKey(KeySorts.Encryption, keyRequest, timestamp)
    try {
        const pol = await unsealer.unseal('Bob', usk, writable)
        console.log('pol: ', pol)
    } catch (e) {
        console.log('error during unsealing: ', e)
    }
}

const listener = async (event) => {
    const decrypt = event.srcElement.classList.contains('decrypt')
    const [inFile] = event.srcElement.files

    const outFileName = decrypt ? inFile.name.replace('.enc', '') : `${inFile.name}.enc`
    const fileWritable = createWriteStream(outFileName)

    const readable = inFile.stream()
    const writable = fileWritable

    const t0 = performance.now()

    if (decrypt) await decryptFile(readable, writable)
    else await encryptFile(readable, writable)

    const t = performance.now() - t0

    console.log(`operation took ${t}$ ms`)
    console.log(`average MB/s: ${inFile.size / (1000 * t)}`)
}

window.onload = async () => {
    const buttons = document.querySelectorAll('input')
    buttons.forEach((btn) => btn.addEventListener('change', listener))
}
