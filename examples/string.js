import * as IrmaCore from "@privacybydesign/irma-core";
import * as IrmaClient from "@privacybydesign/irma-client";
import * as IrmaPopup from "@privacybydesign/irma-popup";
import "@privacybydesign/irma-css";

import { PolyfilledWritableStream } from "web-streams-polyfill";

if (window.WritableStream == undefined) {
  window.WritableStream = PolyfilledWritableStream;
}

const pkg = "http://localhost:8087"; //"https://main.irmaseal-pkg.ihub.ru.nl";
const test_id = "alice";

window.onload = async () => {
  const resp = await fetch(`${pkg}/v2/parameters`);
  const mpk = await resp.json().then((r) => r.publicKey);

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
    const keyRequest = {
      con: [{ t: "irma-demo.gemeente.personalData.fullname", v: "Alice" }],
      validity: 600, // 1 minute, with 1 minute leeway
    };

    const timestamp = hidden[test_id].ts;

    const session = {
      url: pkg,
      start: {
        url: (o) => `${o.url}/v2/request/start`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(keyRequest),
      },
      //    mapping: {
      //      // temporary fix
      //      sessionPtr: (r) => {
      //        const ptr = r.sessionPtr;
      //        ptr.u = `https://ihub.ru.nl/irma/1/${ptr.u}`;
      //        return ptr;
      //      },
      //    },
      result: {
        url: (o, { sessionToken }) => `${o.url}/v2/request/jwt/${sessionToken}`,
        parseResponse: (r) => r.text(),
      },
    };

    const irma = new IrmaCore({ debugging: true, session });

    irma.use(IrmaClient);
    irma.use(IrmaPopup);

    const jwt = await irma.start();
    const usk = await fetch(`${pkg}/v2/request/key/${timestamp.toString()}`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    })
      .then((keyResponse) => keyResponse.json())
      .then((json) => {
        if (json.status !== "DONE" || json.proofStatus !== "VALID")
          throw new Error("not done and valid");
        return json.key;
      })
      .catch((e) => console.log("error: ", e));

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
