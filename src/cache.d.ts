export = CachePlugin;
declare class CachePlugin {
    constructor({ stateMachine, options }: {
        stateMachine: any;
        options: any;
    });
    _identity: any;
    _serializedIdentity: string;
    _timestamp: any;
    _maxAge: any;
    _url: any;
    _stateMachine: any;
    _tokenFromCache: boolean;
    _uskFromCache: boolean;
    start(): void;
    stateChange({ newState, payload }: {
        newState: any;
        payload: any;
    }): void;
    _sessionToken: any;
}
