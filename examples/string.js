import * as IrmaCore from "@privacybydesign/irma-core";
import * as IrmaClient from "@privacybydesign/irma-client";
import * as IrmaPopup from "@privacybydesign/irma-popup";
import "@privacybydesign/irma-css";

import { PolyfilledWritableStream } from "web-streams-polyfill";

if (window.WritableStream == undefined) {
  window.WritableStream = PolyfilledWritableStream;
}

const pkg = "http://localhost:8087";
const test_id = "l.botros@cs.ru.nl";

window.onload = async () => {
  const resp = await fetch(`${pkg}/v2/parameters`);
  const mpk = await resp.json().then((r) => r.public_key);

  console.log("retrieved public key: ", mpk);

  const mod = await import("@e4a/irmaseal-wasm-bindings");
  console.log("loaded WASM module");

  const policies = {
    [test_id]: {
      ts: Math.round(Date.now() / 1000),
      c: [{ t: "pbdf.gemeente.personalData.fullname", v: "L. Botros" }],
    },
  };

  console.log("Encrypting using policies: ", policies);

  const input = "plaintext";

  const sealer_readable = new ReadableStream({
    start: (controller) => {
      const encoded = new TextEncoder().encode(input);
      controller.enqueue(encoded);
      controller.close();
    },
  });

  let output = new Uint8Array(0);
  const sealer_writable = new WritableStream({
    write: (chunk) => {
      output = new Uint8Array([...output, ...chunk]);
    },
  });

  const t0 = performance.now();

  try {
    await mod.seal(mpk, policies, sealer_readable, sealer_writable);
  } catch (e) {
    console.log("error during sealing: ", e);
  }

  const tEncrypt = performance.now() - t0;

  console.log(`tEncrypt ${tEncrypt}$ ms`);

  /// Decryption

  const unsealer_readable = new ReadableStream({
    start: (controller) => {
      controller.enqueue(output);
      controller.close();
    },
  });

  let original = "";
  const unsealer_writable = new WritableStream({
    write: (chunk) => {
      original += new TextDecoder().decode(chunk);
    },
  });

  try {
    const unsealer = await new mod.Unsealer(unsealer_readable);
    const hidden = unsealer.get_hidden_policies();
    console.log("hidden policy: ", hidden);

    // Guess it right, order should not matter
    const irmaIdentity = {
      con: [{ t: "pbdf.gemeente.personalData.fullname", v: "L. Botros" }],
    };

    const timestamp = hidden[test_id].ts;

    const session = {
      url: pkg,
      start: {
        url: (o) => `${o.url}/v2/request`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(irmaIdentity),
      },
      result: {
        url: (o, { sessionToken }) =>
          `${o.url}/v2/request/${sessionToken}/${timestamp.toString()}`,
        parseResponse: (r) => {
          return new Promise((resolve, reject) => {
            if (r.status != "200") reject("not ok");
            r.json().then((json) => {
              if (json.status !== "DONE_VALID") reject("not done and valid");
              resolve(json.key);
            });
          });
        },
      },
    };

    const irma = new IrmaCore({ debugging: true, session });

    irma.use(IrmaClient);
    irma.use(IrmaPopup);

    const usk = await irma.start();
    console.log("retrieved usk: ", usk);

    const t0 = performance.now();

    await unsealer.unseal(test_id, usk, unsealer_writable);

    console.log("original: ", original);

    const tDecrypt = performance.now() - t0;

    console.log(`tDecrypt ${tDecrypt}$ ms`);
  } catch (e) {
    console.log("error during unsealing: ", e);
  }
};
