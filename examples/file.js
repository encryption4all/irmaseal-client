import { SealTransform } from './../dist/irmaseal-client'

async function encryptFile(inFileHandle, outFileHandle, secret, nonce) {
  const inFile = await inFileHandle.getFile()
  const reader = inFile.stream()
  const writer = await outFileHandle.createWritable()

  await reader
    .pipeThrough(
      new SealTransform({ secret: secret, nonce: nonce, decrypt: false })
    )
    .pipeTo(writer)
}

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
  const encButton = document.querySelector('button.encrypt')
  const decButton = document.querySelector('button.decrypt')

  const secret = window.crypto.getRandomValues(new Uint8Array(32))
  const nonce = window.crypto.getRandomValues(new Uint8Array(12))

  encButton.addEventListener('click', async () => {
    const [fileHandle] = await window.showOpenFilePicker()
    const outFileHandle = await window.showSaveFilePicker()
    const file = await fileHandle.getFile()
    const fileSize = file.size

    const t0 = performance.now()
    await encryptFile(fileHandle, outFileHandle, secret, nonce)
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
