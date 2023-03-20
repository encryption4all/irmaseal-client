import * as IrmaCore from '@privacybydesign/irma-core'
import * as IrmaClient from '@privacybydesign/irma-client'
import * as IrmaPopup from '@privacybydesign/irma-popup'
import '@privacybydesign/irma-css'

export const KeySorts = {
    Encryption: 'key',
    Signing: 'sign/key',
}

export const PKG_URL = 'http://localhost:8087'

export async function fetchKey(sort, keyRequest, timestamp = undefined) {
    const session = {
        url: PKG_URL,
        start: {
            url: (o) => `${o.url}/v2/request/start`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(keyRequest),
        },
        result: {
            url: (o, { sessionToken }) => `${o.url}/v2/request/jwt/${sessionToken}`,
            parseResponse: (r) => {
                return r
                    .text()
                    .then((jwt) =>
                        fetch(
                            `${PKG_URL}/v2/irma/${sort}${
                                timestamp ? '/' + timestamp.toString() : ''
                            }`,
                            {
                                headers: {
                                    Authorization: `Bearer ${jwt}`,
                                },
                            }
                        )
                    )
                    .then((r) => r.json())
                    .then((json) => {
                        if (json.status !== 'DONE' || json.proofStatus !== 'VALID')
                            throw new Error('not done and valid')
                        return json.key
                    })
                    .catch((e) => console.log('error: ', e))
            },
        },
    }

    const irma = new IrmaCore({ debugging: true, session })
    irma.use(IrmaClient)
    irma.use(IrmaPopup)
    return irma.start()
}
