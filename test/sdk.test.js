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
import {beforeEach, afterEach, test} from "node:test";
import Casdoor, {CasdoorSdk, parseJwt, parseUrlParams} from "../src/index.js";

const config = {
  serverUrl: "https://door.casdoor.com/",
  clientId: "014ae4bd048734ca2dea",
  appName: "app-casnode",
  organizationName: "casbin",
};

let storage;
let requests;
let respond;
let platform;

function mockUni() {
  storage = new Map();
  requests = [];
  respond = () => ({statusCode: 404, data: "not found"});
  platform = "web";
  globalThis.uni = {
    getStorageSync: (key) => (storage.has(key) ? storage.get(key) : ""),
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: (key) => storage.delete(key),
    getSystemInfoSync: () => ({uniPlatform: platform}),
    request(options) {
      const request = Object.assign({}, options, {body: Object.fromEntries(new URLSearchParams(options.data || ""))});
      requests.push(request);
      Promise.resolve().then(() => {
        const res = respond(request);
        if (res instanceof Error) {
          options.fail({errMsg: res.message});
        } else {
          options.success(res);
        }
      });
    },
    login(options) {
      options.success({code: "wx-code"});
    },
  };
}

function mockWindow(href) {
  const url = new URL(href);
  const history = [];
  globalThis.window = {
    location: {href: url.href, origin: url.origin},
    history: {replaceState: (state, title, next) => history.push(next)},
  };
  globalThis.document = {};
  return history;
}

function jwt(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({alg: "RS256"})}.${encode(payload)}.signature`;
}

beforeEach(() => mockUni());

afterEach(() => {
  delete globalThis.uni;
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.plus;
});

test("requires serverUrl and clientId", () => {
  assert.throws(() => new CasdoorSdk({serverUrl: "https://door.casdoor.com"}), /required/);
});

test("signin URL uses PKCE and a random state", async () => {
  mockWindow("http://localhost:5173/#/");
  const sdk = new CasdoorSdk(config);
  const first = new URL(await sdk.getSigninUrl());
  const saved = JSON.parse(storage.get("casdoor-auth-request"));

  assert.equal(first.origin + first.pathname, "https://door.casdoor.com/login/oauth/authorize");
  assert.equal(first.searchParams.get("client_id"), config.clientId);
  assert.equal(first.searchParams.get("response_type"), "code");
  assert.equal(first.searchParams.get("redirect_uri"), "http://localhost:5173/callback");
  assert.equal(first.searchParams.get("scope"), "openid profile email");
  assert.equal(first.searchParams.get("code_challenge_method"), "S256");
  assert.equal(first.searchParams.get("state"), saved.state);
  assert.equal(first.searchParams.get("code_challenge"), createHash("sha256").update(saved.codeVerifier).digest("base64url"));
  assert.notEqual(saved.state, config.appName);
  assert.match(saved.codeVerifier, /^[A-Za-z0-9_-]{43}$/);

  const second = new URL(await sdk.getSigninUrl({prompt: "login"}));
  assert.notEqual(second.searchParams.get("state"), first.searchParams.get("state"));
  assert.equal(second.searchParams.get("prompt"), "login");

  const signup = await sdk.getSignupUrl();
  assert.match(signup, /^https:\/\/door\.casdoor\.com\/signup\/oauth\/authorize\?/);
});

test("redirect URI per platform and config", () => {
  mockWindow("https://app.example.com/some/page");
  assert.equal(new CasdoorSdk(config).getRedirectUri(), "https://app.example.com/callback");
  assert.equal(new CasdoorSdk(Object.assign({redirectPath: "/pages/callback/callback"}, config)).getRedirectUri(), "https://app.example.com/pages/callback/callback");
  assert.equal(new CasdoorSdk(Object.assign({redirectPath: "myapp://cb"}, config)).getRedirectUri(), "myapp://cb");
  assert.equal(new CasdoorSdk(Object.assign({redirectUri: "https://x.test/cb"}, config)).getRedirectUri(), "https://x.test/cb");
  platform = "app";
  assert.equal(new CasdoorSdk(config).getRedirectUri(), "http://localhost/callback");
});

test("platform detection falls back to globals", () => {
  globalThis.uni.getSystemInfoSync = () => {
    throw new Error("not available");
  };
  assert.equal(new CasdoorSdk(config).getPlatform(), "unknown");
  globalThis.wx = {login() {}};
  assert.equal(new CasdoorSdk(config).getPlatform(), "mp-weixin");
  delete globalThis.wx;
  mockWindow("http://localhost/");
  assert.equal(new CasdoorSdk(config).getPlatform(), "web");
  globalThis.plus = {};
  assert.equal(new CasdoorSdk(config).getPlatform(), "app");
  assert.equal(new CasdoorSdk(Object.assign({platform: "mp-alipay"}, config)).getPlatform(), "mp-alipay");
});

test("handleCallback exchanges the code with the verifier and no secret", async () => {
  mockWindow("http://localhost:5173/");
  const sdk = new CasdoorSdk(config);
  await sdk.getSigninUrl();
  const saved = JSON.parse(storage.get("casdoor-auth-request"));
  const history = mockWindow(`http://localhost:5173/callback?code=abc&state=${saved.state}&iss=https%3A%2F%2Fdoor.casdoor.com&lang=en#/`);

  respond = () => ({statusCode: 200, data: {access_token: "at", id_token: "it", refresh_token: "rt", expires_in: 3600, scope: "openid profile"}});
  const token = await sdk.handleCallback();

  assert.equal(requests.length, 1);
  const request = requests[0];
  assert.equal(request.url, "https://door.casdoor.com/api/login/oauth/access_token");
  assert.equal(request.method, "POST");
  assert.equal(request.header["content-type"], "application/x-www-form-urlencoded");
  assert.deepEqual(request.body, {
    grant_type: "authorization_code",
    client_id: config.clientId,
    code: "abc",
    code_verifier: saved.codeVerifier,
    redirect_uri: "http://localhost:5173/callback",
  });
  assert.equal(token.access_token, "at");
  assert.ok(token.expires_at > Date.now());
  assert.equal(sdk.getAccessToken(), "at");
  assert.equal(sdk.isSignedIn(), true);
  assert.equal(sdk.isTokenExpired(), false);
  assert.equal(storage.has("casdoor-auth-request"), false);
  assert.deepEqual(history, ["http://localhost:5173/callback?lang=en#/"]);
});

test("handleCallback reads parameters in the hash and returns null without a callback", async () => {
  const sdk = new CasdoorSdk(config);
  assert.equal(await sdk.handleCallback("http://localhost/#/pages/index/index"), null);
  mockWindow("http://localhost/");
  assert.equal(await sdk.handleCallback(), null);

  await sdk.getSigninUrl();
  const saved = JSON.parse(storage.get("casdoor-auth-request"));
  respond = () => ({statusCode: 200, data: {access_token: "at"}});
  const token = await sdk.handleCallback(`http://localhost/#/pages/callback/callback?code=c1&state=${saved.state}`);
  assert.equal(token.access_token, "at");
  assert.equal(token.expires_at, undefined);
  assert.equal(requests[0].body.code, "c1");
});

test("handleCallback rejects a wrong or replayed state", async () => {
  mockWindow("http://localhost/");
  const sdk = new CasdoorSdk(config);
  await assert.rejects(sdk.handleCallback("http://localhost/callback?code=c&state=x"), {code: "invalid_state"});

  await sdk.getSigninUrl();
  const saved = JSON.parse(storage.get("casdoor-auth-request"));
  await assert.rejects(sdk.handleCallback("http://localhost/callback?code=c&state=forged"), {code: "invalid_state"});
  await assert.rejects(sdk.handleCallback(`http://localhost/callback?code=c&state=${saved.state}`), {code: "invalid_state"});
  assert.equal(requests.length, 0);
});

test("handleCallback reports an error from Casdoor", async () => {
  mockWindow("http://localhost/");
  const sdk = new CasdoorSdk(config);
  await sdk.getSigninUrl();
  const saved = JSON.parse(storage.get("casdoor-auth-request"));
  await assert.rejects(
    sdk.handleCallback(`http://localhost/callback?error=access_denied&error_description=no+way&state=${saved.state}`),
    {code: "access_denied", message: "access_denied: no way"},
  );
});

test("token errors and network errors are rejected", async () => {
  const sdk = new CasdoorSdk(config);
  respond = () => ({statusCode: 400, data: {error: "invalid_grant", error_description: "verifier is invalid"}});
  await assert.rejects(sdk.exchangeCode("c", "v", "r"), {code: "invalid_grant", message: "invalid_grant: verifier is invalid"});
  respond = () => ({statusCode: 502, data: "<html>bad gateway</html>"});
  await assert.rejects(sdk.exchangeCode("c", "v", "r"), {code: "token_request_failed", message: "token_request_failed: HTTP 502"});
  respond = () => new Error("request:fail timeout");
  await assert.rejects(sdk.exchangeCode("c", "v", "r"), {code: "request_failed", message: "request:fail timeout"});
  respond = () => ({statusCode: 200, data: JSON.stringify({access_token: "from-text"})});
  assert.equal((await sdk.exchangeCode("c", "v", "r")).access_token, "from-text");
});

test("signin redirects on H5", async () => {
  mockWindow("http://localhost:5173/");
  const sdk = new CasdoorSdk(config);
  const pending = sdk.signin();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.match(window.location.href, /^https:\/\/door\.casdoor\.com\/login\/oauth\/authorize\?/);
  assert.equal(await Promise.race([pending, Promise.resolve("pending")]), "pending");

  sdk.signup();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.match(window.location.href, /\/signup\/oauth\/authorize\?/);
});

test("signin on App opens a webview and catches the redirect URI", async () => {
  platform = "app";
  let webview;
  globalThis.plus = {
    webview: {
      create(url, id, styles) {
        webview = {url, id, styles, listeners: {}, closed: false, shown: false};
        webview.overrideUrlLoading = (options, callback) => {
          webview.override = options;
          webview.onOverride = callback;
        };
        webview.addEventListener = (name, callback) => {
          webview.listeners[name] = callback;
        };
        webview.show = () => {
          webview.shown = true;
        };
        webview.close = () => {
          webview.closed = true;
          webview.listeners.close();
        };
        return webview;
      },
    },
  };

  const sdk = new CasdoorSdk(config);
  respond = () => ({statusCode: 200, data: {access_token: "app-token"}});
  const pending = sdk.signin({title: "Casdoor"});
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.ok(webview.shown);
  assert.equal(webview.styles.titleNView.titleText, "Casdoor");
  assert.match(webview.url, /redirect_uri=http%3A%2F%2Flocalhost%2Fcallback/);
  assert.equal(webview.override.mode, "reject");
  assert.ok(new RegExp(webview.override.match).test("http://localhost/callback?code=x&state=y"));
  assert.ok(!new RegExp(webview.override.match).test("http://localhostXcallback"));

  const state = new URL(webview.url).searchParams.get("state");
  webview.onOverride({url: `http://localhost/callback?code=app-code&state=${state}`});
  const token = await pending;
  assert.ok(webview.closed);
  assert.equal(token.access_token, "app-token");
  assert.equal(requests[0].body.code, "app-code");

  const cancelled = sdk.signin();
  await new Promise((resolve) => setTimeout(resolve, 10));
  webview.close();
  await assert.rejects(cancelled, {code: "cancelled"});
});

test("signin on WeChat mini programs uses Casdoor's mini program login", async () => {
  platform = "mp-weixin";
  const sdk = new CasdoorSdk(config);
  respond = () => ({statusCode: 200, data: {access_token: "wx-token", refresh_token: "wx-refresh"}});
  const token = await sdk.signin({username: "Alice", avatar: "https://a.test/a.png"});
  assert.equal(token.access_token, "wx-token");
  assert.deepEqual(requests[0].body, {
    tag: "wechat_miniprogram",
    client_id: config.clientId,
    code: "wx-code",
    username: "Alice",
    avatar: "https://a.test/a.png",
  });

  globalThis.uni.login = (options) => options.fail({errMsg: "login:fail"});
  await assert.rejects(sdk.signin(), {code: "wechat_login_failed"});
});

test("signin is rejected on unsupported platforms", async () => {
  platform = "mp-alipay";
  await assert.rejects(new CasdoorSdk(config).signin(), {code: "unsupported_platform"});
});

test("refreshToken keeps the refresh token when Casdoor does not rotate it", async () => {
  const sdk = new CasdoorSdk(config);
  await assert.rejects(sdk.refreshToken(), {code: "no_refresh_token"});

  sdk.saveToken({access_token: "old", refresh_token: "rt", scope: "openid profile"});
  respond = () => ({statusCode: 200, data: {access_token: "new", expires_in: 10}});
  const token = await sdk.refreshToken();
  assert.deepEqual(requests[0].body, {grant_type: "refresh_token", client_id: config.clientId, refresh_token: "rt", scope: "openid profile"});
  assert.equal(token.access_token, "new");
  assert.equal(token.refresh_token, "rt");
  assert.equal(sdk.getAccessToken(), "new");
});

test("getUserInfo sends the bearer token", async () => {
  const sdk = new CasdoorSdk(config);
  await assert.rejects(sdk.getUserInfo(), {code: "not_signed_in"});

  sdk.saveToken({access_token: "at"});
  respond = () => ({statusCode: 200, data: {sub: "1", name: "alice"}});
  assert.deepEqual(await sdk.getUserInfo(), {sub: "1", name: "alice"});
  assert.equal(requests[0].url, "https://door.casdoor.com/api/userinfo");
  assert.equal(requests[0].header.Authorization, "Bearer at");

  respond = () => ({statusCode: 200, data: {status: "error", msg: "Token not found"}});
  await assert.rejects(sdk.getUserInfo(), {code: "userinfo_failed", message: "Token not found"});
  respond = () => ({statusCode: 401, data: ""});
  await assert.rejects(sdk.getUserInfo(), {message: "HTTP 401"});
});

test("logout clears the token and revokes it", async () => {
  mockWindow("http://localhost/");
  const sdk = new CasdoorSdk(config);
  await sdk.logout();
  assert.equal(requests.length, 0);

  sdk.saveToken({access_token: "at", id_token: "it"});
  respond = () => new Error("offline");
  await sdk.logout();
  assert.equal(sdk.isSignedIn(), false);
  assert.equal(sdk.isTokenExpired(), true);
  assert.equal(requests[0].url, "https://door.casdoor.com/api/logout");
  assert.deepEqual(requests[0].body, {id_token_hint: "it"});

  sdk.saveToken({access_token: "at"});
  sdk.logout({postLogoutRedirectUri: "http://localhost/", state: "s"});
  assert.equal(window.location.href, "https://door.casdoor.com/api/logout?id_token_hint=at&post_logout_redirect_uri=http%3A%2F%2Flocalhost%2F&state=s");
});

test("profile URLs carry the access token", () => {
  const sdk = new CasdoorSdk(config);
  assert.equal(sdk.getMyProfileUrl(), "https://door.casdoor.com/account");
  assert.equal(sdk.getUserProfileUrl("alice"), "https://door.casdoor.com/users/casbin/alice");
  sdk.saveToken({access_token: "a b"});
  assert.equal(sdk.getMyProfileUrl("http://localhost/"), "https://door.casdoor.com/account?access_token=a%20b&returnUrl=http%3A%2F%2Flocalhost%2F");
  assert.equal(sdk.getUserProfileUrl("alice"), "https://door.casdoor.com/users/casbin/alice?access_token=a%20b");
});

test("expired tokens and broken storage", () => {
  const sdk = new CasdoorSdk(config);
  storage.set("casdoor-token", JSON.stringify({access_token: "at", expires_at: Date.now() - 1}));
  assert.equal(sdk.isTokenExpired(), true);
  storage.set("casdoor-token", "{broken");
  assert.equal(sdk.getToken(), null);
  storage.set("casdoor-token", {access_token: "object"});
  assert.equal(sdk.getAccessToken(), "object");
});

test("custom storage is used instead of uni storage", () => {
  const items = {};
  const sdk = new CasdoorSdk(Object.assign({
    storage: {
      getItem: (key) => items[key],
      setItem: (key, value) => {
        items[key] = value;
      },
      removeItem: (key) => delete items[key],
    },
  }, config));
  sdk.saveToken({access_token: "custom"});
  assert.equal(storage.size, 0);
  assert.equal(sdk.getAccessToken(), "custom");
});

test("parseJwt and parseAccessToken decode the payload", () => {
  const sdk = new CasdoorSdk(config);
  sdk.saveToken({access_token: jwt({name: "卡斯多", owner: "casbin"})});
  assert.deepEqual(sdk.parseAccessToken(), {name: "卡斯多", owner: "casbin"});
  assert.throws(() => parseJwt("not-a-jwt"), {code: "invalid_token"});
});

test("parseUrlParams decodes values", () => {
  assert.deepEqual(parseUrlParams("http://x/cb?a=1&b=hello+world&c=%E4%B8%AD&flag&bad=%E4#/p?d=2"), {
    a: "1",
    b: "hello world",
    c: "中",
    flag: "",
    bad: "%E4",
    d: "2",
  });
});

test("Vue 3 plugin registers $casdoor and provides it", () => {
  const provided = {};
  const app = {config: {globalProperties: {}}, provide: (key, value) => (provided[key] = value)};
  Casdoor.install(app, config);
  assert.ok(app.config.globalProperties.$casdoor instanceof CasdoorSdk);
  assert.equal(provided.casdoor, app.config.globalProperties.$casdoor);
});

test("Vue 2 plugin registers $casdoor on the prototype", () => {
  function Vue() {}
  Vue.config = {};
  const sdk = new CasdoorSdk(config);
  Casdoor.install(Vue, sdk);
  assert.equal(Vue.prototype.$casdoor, sdk);
});
