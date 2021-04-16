import { SealTransform } from './../dist/irmaseal-client'
import streamSaver from 'streamsaver'

async function decryptFile(inFileHandle, outFileHandle, secret, nonce) {
  const inFile = await inFileHandle.getFile()
  const reader = inFile.stream()
  const writer = await outFileHandle.createWritable()

  await reader
    .pipeThrough(
      new SealTransform({ secret: secret, nonce: nonce, decrypt: true })
    )
    .pipeTo(writer)
}

window.onload = async () => {
  const encButton = document.querySelector('input.encrypt')
  const decButton = document.querySelector('input.decrypt')

  const secret = window.crypto.getRandomValues(new Uint8Array(32))
  const nonce = window.crypto.getRandomValues(new Uint8Array(12))

  encButton.addEventListener('change', async () => {
    const [inFile] = encButton.files
    console.log(inFile)

    const outFileStream = streamSaver.createWriteStream('out.enc', {
      size: inFile.size,
    })
    const reader = inFile.stream()
    console.log(reader)
    const t0 = performance.now()

    reader
      .pipeThrough(
        new SealTransform({ secret: secret, nonce: nonce, decrypt: false })
      )
      .pipeTo(outFileStream)

    const tEncrypt = performance.now() - t0

    console.log(`tEncrypt ${tEncrypt}$ ms`)
    console.log(`average MB/s: ${fileSize / (1000 * tEncrypt)}`)
  })

  decButton.addEventListener('click', async () => {
    const [fileHandle] = await window.showOpenFilePicker()
    const outFileHandle = await window.showSaveFilePicker()

    await decryptFile(fileHandle, outFileHandle, secret, nonce)
  })
}
