# Javascript bindings of irmaseal

Currently only contains 

## Prerequisites

```
cargo install wasm-pack

npm install
```

## Building

```
npm run build
```

`pkg` contains the output of `wasm-pack` which internally uses `wasm-bindgen`
to create Javascript bindings for the output wasm.  The main file of this
library imports these bindings and re-exposes them via the functions in
`irmaseal.js`.
