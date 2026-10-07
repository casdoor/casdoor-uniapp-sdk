// Copyright 2026 The Casdoor Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {test} from "node:test";
import {
  base64UrlDecode,
  base64UrlEncode,
  getCodeChallenge,
  getRandomBytes,
  getRandomString,
  sha256,
  utf8Decode,
  utf8Encode,
} from "../src/pkce.js";

test("sha256 matches node:crypto for inputs around the block size", () => {
  for (const length of [0, 1, 55, 56, 63, 64, 65, 119, 120, 1000]) {
    const text = Array.from("a中😀".repeat(length)).slice(0, length).join("");
    const expected = [...createHash("sha256").update(text, "utf8").digest()];
    assert.deepEqual(sha256(utf8Encode(text)), expected, `length ${length}`);
  }
});

test("utf8 encoding round-trips and matches Buffer", () => {
  const text = "Casdoor 卡斯多 😀 ünïcödé";
  assert.deepEqual(utf8Encode(text), [...Buffer.from(text, "utf8")]);
  assert.equal(utf8Decode(utf8Encode(text)), text);
});

test("base64url matches Buffer and round-trips", () => {
  for (let length = 0; length < 40; length++) {
    const bytes = Array.from({length}, (_, i) => (i * 37 + 11) & 0xff);
    const encoded = base64UrlEncode(bytes);
    assert.equal(encoded, Buffer.from(bytes).toString("base64url"));
    assert.deepEqual(base64UrlDecode(encoded), bytes);
  }
  assert.throws(() => base64UrlDecode("a*b"), /invalid base64url/);
});

test("code challenge is BASE64URL(SHA256(verifier))", () => {
  const verifier = "dBjftJeZ4CVP-mJ0OB0kXRu6v5yhDS3e7mcnbYxDBRA";
  assert.equal(getCodeChallenge(verifier), createHash("sha256").update(verifier).digest("base64url"));
});

test("random strings are unique and url safe", async () => {
  const values = new Set();
  for (let i = 0; i < 50; i++) {
    const value = await getRandomString(32);
    assert.match(value, /^[A-Za-z0-9_-]{43}$/);
    values.add(value);
  }
  assert.equal(values.size, 50);
});

test("random bytes use uni.getRandomValues without Web Crypto", async (t) => {
  const crypto = globalThis.crypto;
  Object.defineProperty(globalThis, "crypto", {value: undefined, configurable: true});
  t.after(() => {
    Object.defineProperty(globalThis, "crypto", {value: crypto, configurable: true});
    delete globalThis.uni;
  });

  let calls = 0;
  globalThis.uni = {
    getRandomValues({length, success}) {
      calls++;
      success({randomValues: new Uint8Array(length).fill(7).buffer});
    },
  };
  assert.deepEqual(await getRandomBytes(4), [7, 7, 7, 7]);
  assert.equal(calls, 1);

  globalThis.uni = {getRandomValues: ({fail}) => fail({errMsg: "not supported"})};
  const fallback = await getRandomBytes(40);
  assert.equal(fallback.length, 40);
  assert.notDeepEqual(fallback, await getRandomBytes(40));

  delete globalThis.uni;
  assert.equal((await getRandomBytes(8)).length, 8);
});
