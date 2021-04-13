import { Client } from './../dist/irmaseal-client'

window.onload = async () => {
  const client = await Client.build('https://qrona.info/pkg', false)

  const encButton = document.querySelector('button.encrypt')
  const decButton = document.querySelector('button.decrypt')

  const keySpec = {
    name: 'AES-CTR',
    length: 128,
  }

  const key = await window.crypto.subtle.generateKey(keySpec, true, [
    'encrypt',
    'decrypt',
  ])

  // 12-byte nonce, 4-byte counter
  const iv = window.crypto.getRandomValues(new Uint8Array(12))

  encButton.addEventListener('click', async () => {
    const [fileHandle] = await window.showOpenFilePicker()
    const outFileHandle = await window.showSaveFilePicker()

    await client.encryptFile(fileHandle, outFileHandle, key, iv)
  })

  decButton.addEventListener('click', async () => {
    const [fileHandle] = await window.showOpenFilePicker()
    const outFileHandle = await window.showSaveFilePicker()

    await client.decryptFile(fileHandle, outFileHandle, key, iv)
  })
}
