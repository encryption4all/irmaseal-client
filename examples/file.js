import * as IrmaCore from "@privacybydesign/irma-core";
import * as IrmaClient from "@privacybydesign/irma-client";
import * as IrmaPopup from "@privacybydesign/irma-popup";
import "@privacybydesign/irma-css";

import { PolyfilledWritableStream } from "web-streams-polyfill";
import { createWriteStream } from "streamsaver";

if (window.WritableStream == undefined) {
  window.WritableStream = PolyfilledWritableStream;
}

const pkg = "https://main.irmaseal-pkg.ihub.ru.nl";
const identifier = "alice";
var mpk;
var mod;

const listener = async (event) => {
  const decrypt = event.srcElement.classList.contains("decrypt");
  const [inFile] = event.srcElement.files;

  const outFileName = decrypt
    ? inFile.name.replace(".enc", "")
    : `${inFile.name}.enc`;
  const fileWritable = createWriteStream(outFileName);

  const readable = inFile.stream();
  const writable = fileWritable;

  if (!decrypt) {
    // This example uses a demo credential.
    // Anyone get retrieve an instance with custom data at the following URL:
    // https://privacybydesign.foundation/attribute-index/en/irma-demo.gemeente.personalData.html
    const policies = {
      [identifier]: {
        ts: Math.round(Date.now() / 1000),
        c: [{ t: "irma-demo.gemeente.personalData.fullname", v: "Alice" }],
      },
    };

    console.log("Encrypting file using policies: ", policies);

    const t0 = performance.now();

    try {
      await mod.seal(mpk, policies, readable, writable);
    } catch (e) {
      console.log("error during sealing: ", e);
    }

    const tEncrypt = performance.now() - t0;

    console.log(`tEncrypt ${tEncrypt}$ ms`);
    console.log(`average MB/s: ${inFile.size / (1000 * tEncrypt)}`);
  } else {
    try {
      const unsealer = await mod.Unsealer.new(readable);
      const hidden = unsealer.get_hidden_policies();
      console.log("hidden policy: ", hidden);

      // Guess it right
      const guess = {
        con: [{ t: "irma-demo.gemeente.personalData.fullname", v: "Alice" }],
      };

      const timestamp = hidden[identifier].ts;

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

      await unsealer.unseal(identifier, usk, writable);

      const tDecrypt = performance.now() - t0;

      console.log(`tDecrypt ${tDecrypt}$ ms`);
      console.log(`average MB/s: ${inFile.size / (1000 * tDecrypt)}`);
    } catch (e) {
      console.log("error during unsealing: ", e);
    }
  }
};

window.onload = async () => {
  const resp = await fetch(`${pkg}/v2/parameters`);
  mpk = await resp.json().then((r) => r.public_key);

  console.log("retrieved public key: ", mpk);

  mod = await import("@e4a/irmaseal-wasm-bindings");
  console.log("loaded WASM module");

  const buttons = document.querySelectorAll("input");
  buttons.forEach((btn) => btn.addEventListener("change", listener));
};
