import * as YiviCore from '@privacybydesign/yivi-core'
import * as YiviClient from '@privacybydesign/yivi-client'
import * as YiviPopup from '@privacybydesign/yivi-popup'
import '@privacybydesign/yivi-css'

export const KeySorts = {
    Encryption: 'key',
    Signing: 'sign/key',
}

export const PKG_URL = 'https://main.postguard.ihub.ru.nl/pkg'

export async function fetchKey(
    sort,
    keyRequest,
    timestamp = undefined,
    signingKeyRequest = undefined
) {
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
                                method: sort === KeySorts.Encryption ? 'GET' : 'POST',
                                headers: {
                                    Authorization: `Bearer ${jwt}`,
                                    'Content-Type': 'application/json',
                                },
                                ...(signingKeyRequest && {
                                    body: JSON.stringify({ ...signingKeyRequest }),
                                }),
                            }
                        )
                    )
                    .then((r) => r.json())
                    .then((json) => {
                        if (json.status !== 'DONE' || json.proofStatus !== 'VALID')
                            throw new Error('not done and valid')
                        return sort === KeySorts.Encryption
                            ? json.key
                            : { pubSignKey: json.pubSignKey, privSignKey: json.privSignKey }
                    })
                    .catch((e) => console.log('error: ', e))
            },
        },
    }

    const yivi = new YiviCore({ debugging: false, session })
    yivi.use(YiviClient)
    yivi.use(YiviPopup)
    return yivi.start()
}
