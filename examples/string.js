import * as IrmaCore from "@privacybydesign/irma-core";
import * as IrmaClient from "@privacybydesign/irma-client";
import * as IrmaPopup from "@privacybydesign/irma-popup";
import "@privacybydesign/irma-css";

import { PolyfilledWritableStream } from "web-streams-polyfill";

if (window.WritableStream == undefined) {
  window.WritableStream = PolyfilledWritableStream;
}

const pkg = "https://main.irmaseal-pkg.ihub.ru.nl";
const test_id = "alice";

window.onload = async () => {
  const resp = await fetch(`${pkg}/v2/parameters`);
  const mpk = await resp.json().then((r) => r.public_key);

  console.log("retrieved public key: ", mpk);

  const mod = await import("@e4a/irmaseal-wasm-bindings");
  console.log("loaded WASM module");

  // This example uses a demo credential.
  // Anyone get retrieve an instance with custom data at the following URL:
  // https://privacybydesign.foundation/attribute-index/en/irma-demo.gemeente.personalData.html
  const policies = {
    [test_id]: {
      ts: Math.round(Date.now() / 1000),
      c: [{ t: "irma-demo.gemeente.personalData.fullname", v: "Alice" }],
    },
  };

  console.log("Encrypting using policies: ", policies);

  const input = "plaintext";

  const sealerReadable = new ReadableStream({
    start: (controller) => {
      const encoded = new TextEncoder().encode(input);
      controller.enqueue(encoded);
      controller.close();
    },
  });

  let output = new Uint8Array(0);
  const sealerWritable = new WritableStream({
    write: (chunk) => {
      output = new Uint8Array([...output, ...chunk]);
    },
  });

  const t0 = performance.now();

  try {
    await mod.seal(mpk, policies, sealerReadable, sealerWritable);
  } catch (e) {
    console.log("error during sealing: ", e);
  }

  const tEncrypt = performance.now() - t0;

  console.log(`tEncrypt ${tEncrypt}$ ms`);

  /// Decryption

  const unsealerReadable = new ReadableStream({
    start: (controller) => {
      controller.enqueue(output);
      controller.close();
    },
  });

  let original = "";
  const unsealerWritable = new WritableStream({
    write: (chunk) => {
      original += new TextDecoder().decode(chunk);
    },
  });

  try {
    const unsealer = await mod.Unsealer.new(unsealerReadable);
    const hidden = unsealer.get_hidden_policies();
    console.log("hidden policy: ", hidden);

    // Guess it right, order should not matter
    const guess = {
      con: [{ t: "irma-demo.gemeente.personalData.fullname", v: "Alice" }],
    };

    const timestamp = hidden[test_id].ts;

    const session = {
      url: pkg,
      start: {
        url: (o) => `${o.url}/v2/request`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guess),
      },
      mapping: {
        // temporary fix
        sessionPtr: (r) => {
          const ptr = r.sessionPtr;
          ptr.u = `https://ihub.ru.nl/irma/1/${ptr.u}`;
          return ptr;
        },
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

    await unsealer.unseal(test_id, usk, unsealerWritable);

    console.log("original: ", original);

    const tDecrypt = performance.now() - t0;

    console.log(`tDecrypt ${tDecrypt}$ ms`);
  } catch (e) {
    console.log("error during unsealing: ", e);
  }
};
