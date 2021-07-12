/**
 * Class for a plugin for irma-core which caches intermediate session tokens or user secret keys.
 * Usage: irma.use(CachePlugin)
 * TODO: cleanup of localStorage?
 */
module.exports = class CachePlugin {
  constructor({ stateMachine, options }) {
    if (!window.localStorage)
      throw new Error('CachePlugin needs localStorage to work')

    if (
      !options.session.identity ||
      !options.session.timestamp ||
      !options.session.maxAge
    )
      throw new Error(
        'IrmaCore object that uses CachePlugin needs identity, timestamp, maxAge in its session: ',
        options.session
      )

    this._identity = options.session.identity
    this._serializedIdentity = JSON.stringify(this._identity)
    this._timestamp = options.session.timestamp
    this._maxAge = options.session.maxAge
    this._url = options.session.url
    this._stateMachine = stateMachine
  }

  start() {
    // Check for token in localStorage
    const cached = JSON.parse(
      window.localStorage.getItem(this._serializedIdentity)
    )

    if (
      !cached?.token ||
      Object.keys(cached).length === 0 ||
      (cached.validUntil && Date.now() >= cached.validUntil)
    ) {
      console.log(
        'Cache miss or token not valid anymore for identity: ',
        this._identity
      )
      // In this case we want the next plugin to actually do the session
      // and cache the result, so do nothing.
      return
    }

    // If a ket for this timestamp has already been requested,
    // it might be in the cache. If so, that's our result.
    if (cached.keys[this._timestamp])
      this._stateMachine.selectTransition(({ validTransitions }) => {
        if (validTransitions.includes('skip'))
          return { transition: 'skip', payload: cached.keys[this._timestamp] }
      })

    // Otherwise, if a token was in localStorage,
    // we already succesfully completed this session once
    const token = cached.token

    // We have a token just retrieve the result and skip some steps to preparingResult
    fetch(
      `${this._url}/v1/request/${token}/${this._timestamp.toString()}`
    ).then((resp) => {
      if (resp.status !== 200) return {}
      resp.json().then((j) => {
        if (j.status === 'DONE_VALID') {
          const usk = j.key
          cached.keys[this._timestamp] = usk
          window.localStorage.setItem(
            this._serializedIdentity,
            JSON.stringify(cached)
          )
          this._stateMachine.selectTransition(({ validTransitions }) => {
            if (validTransitions.includes('skip'))
              return { transition: 'skip', payload: usk }
          })
        }
      })
    })
  }

  stateChange({ newState, payload }) {
    if (newState === 'CheckingUserAgent') {
      const { sessionToken } = payload
      this._sessionToken = sessionToken
    }

    if (newState === 'Success') {
      const usk = payload

      if (this._sessionToken) {
        const t = new Date(Date.now())
        const validUntil = t.setSeconds(t.getSeconds() + this._maxAge)
        window.localStorage.setItem(
          this._serializedIdentity,
          JSON.stringify({
            token: this._sessionToken,
            validUntil: validUntil,
            keys: { [this._timestamp]: usk },
          })
        )
      }
    }
  }
}
