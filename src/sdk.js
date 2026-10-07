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

import {base64UrlDecode, getCodeChallenge, getRandomString, utf8Decode} from "./pkce.js";

const TOKEN_KEY = "casdoor-token";
const AUTH_REQUEST_KEY = "casdoor-auth-request";
const APP_REDIRECT_URI = "http://localhost/callback";
const APP_WEBVIEW_ID = "casdoor-signin";

function trimSlash(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function buildQuery(params) {
  const parts = [];
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== "") {
      parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
    }
  });
  return parts.join("&");
}

function parseQuery(query, params) {
  query.split("&").forEach((pair) => {
    if (pair === "") {
      return;
    }
    const index = pair.indexOf("=");
    const key = index < 0 ? pair : pair.slice(0, index);
    const value = index < 0 ? "" : pair.slice(index + 1);
    try {
      params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, " "));
    } catch (e) {
      params[key] = value;
    }
  });
}

// Reads the parameters of the query string and of a query string inside the hash (hash routing)
export function parseUrlParams(url) {
  const params = {};
  const text = String(url || "");
  const hashIndex = text.indexOf("#");
  const beforeHash = hashIndex < 0 ? text : text.slice(0, hashIndex);
  const hash = hashIndex < 0 ? "" : text.slice(hashIndex + 1);
  const hashQueryIndex = hash.indexOf("?");
  if (hashQueryIndex >= 0) {
    parseQuery(hash.slice(hashQueryIndex + 1), params);
  }
  const queryIndex = beforeHash.indexOf("?");
  if (queryIndex >= 0) {
    parseQuery(beforeHash.slice(queryIndex + 1), params);
  }
  return params;
}

function removeUrlParams(url, names) {
  const hashIndex = url.indexOf("#");
  const beforeHash = hashIndex < 0 ? url : url.slice(0, hashIndex);
  const hash = hashIndex < 0 ? "" : url.slice(hashIndex);
  const queryIndex = beforeHash.indexOf("?");
  if (queryIndex < 0) {
    return url;
  }
  const kept = beforeHash.slice(queryIndex + 1).split("&").filter((pair) => {
    const key = pair.split("=")[0];
    return pair !== "" && names.indexOf(key) < 0;
  });
  return beforeHash.slice(0, queryIndex) + (kept.length > 0 ? "?" + kept.join("&") : "") + hash;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function getUniStorage() {
  return {
    getItem: (key) => uni.getStorageSync(key),
    setItem: (key, value) => uni.setStorageSync(key, value),
    removeItem: (key) => uni.removeStorageSync(key),
  };
}

export function parseJwt(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) {
    throw createError("invalid_token", "the token is not a JWT");
  }
  return JSON.parse(utf8Decode(base64UrlDecode(parts[1])));
}

export class CasdoorSdk {
  constructor(config) {
    if (!config || !config.serverUrl || !config.clientId) {
      throw createError("invalid_config", "serverUrl and clientId are required");
    }

    this.config = Object.assign({}, config);
    this.config.serverUrl = trimSlash(config.serverUrl);
    if (this.config.redirectPath === undefined || this.config.redirectPath === null) {
      this.config.redirectPath = "/callback";
    }
    if (!this.config.scope) {
      this.config.scope = "openid profile email";
    }
    this.storage = config.storage || getUniStorage();
  }

  // "web" (H5), "app", "mp-weixin" or another uni-app platform name
  getPlatform() {
    if (this.config.platform) {
      return this.config.platform;
    }
    try {
      const platform = uni.getSystemInfoSync().uniPlatform;
      if (platform) {
        return platform;
      }
    } catch (e) {
      // older uni-app versions have no uniPlatform
    }
    if (typeof plus !== "undefined") {
      return "app";
    }
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      return "web";
    }
    if (typeof wx !== "undefined" && wx && typeof wx.login === "function") {
      return "mp-weixin";
    }
    return "unknown";
  }

  getRedirectUri() {
    if (this.config.redirectUri) {
      return this.config.redirectUri;
    }
    if (this.config.redirectPath.indexOf("://") >= 0) {
      return this.config.redirectPath;
    }
    if (this.getPlatform() === "web") {
      return window.location.origin + this.config.redirectPath;
    }
    return APP_REDIRECT_URI;
  }

  readStorage(key) {
    const text = this.storage.getItem(key);
    if (!text) {
      return null;
    }
    try {
      return typeof text === "string" ? JSON.parse(text) : text;
    } catch (e) {
      return null;
    }
  }

  writeStorage(key, value) {
    this.storage.setItem(key, JSON.stringify(value));
  }

  request(options) {
    return new Promise((resolve, reject) => {
      uni.request(Object.assign({}, options, {
        url: this.config.serverUrl + options.url,
        success: (res) => {
          let data = res.data;
          if (typeof data === "string") {
            try {
              data = JSON.parse(data);
            } catch (e) {
              // keep the text
            }
          }
          resolve({statusCode: res.statusCode, data: data});
        },
        fail: (err) => reject(createError("request_failed", (err && err.errMsg) || "request failed")),
      }));
    });
  }

  requestToken(params) {
    return this.request({
      url: "/api/login/oauth/access_token",
      method: "POST",
      header: {"content-type": "application/x-www-form-urlencoded"},
      data: buildQuery(params),
    }).then((res) => {
      const data = res.data;
      if (!data || typeof data !== "object" || data.error || !data.access_token) {
        const code = (data && data.error) || "token_request_failed";
        const description = (data && (data.error_description || data.msg)) || "HTTP " + res.statusCode;
        throw createError(code, code + ": " + description);
      }
      return data;
    });
  }

  saveToken(token) {
    const saved = Object.assign({}, token);
    if (typeof saved.expires_in === "number" && saved.expires_in > 0) {
      saved.expires_at = Date.now() + saved.expires_in * 1000;
    }
    this.writeStorage(TOKEN_KEY, saved);
    return saved;
  }

  getToken() {
    return this.readStorage(TOKEN_KEY);
  }

  getAccessToken() {
    const token = this.getToken();
    return token ? token.access_token : "";
  }

  isSignedIn() {
    return this.getAccessToken() !== "";
  }

  isTokenExpired() {
    const token = this.getToken();
    if (!token) {
      return true;
    }
    return typeof token.expires_at === "number" && Date.now() >= token.expires_at;
  }

  parseAccessToken() {
    return parseJwt(this.getAccessToken());
  }

  // Builds the authorization URL and stores the state and the PKCE code verifier for the callback
  getSigninUrl(additionalParams) {
    return Promise.all([getRandomString(16), getRandomString(32)]).then((values) => {
      const state = values[0];
      const codeVerifier = values[1];
      const redirectUri = this.getRedirectUri();
      this.writeStorage(AUTH_REQUEST_KEY, {state: state, codeVerifier: codeVerifier, redirectUri: redirectUri});

      const params = Object.assign({
        client_id: this.config.clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        scope: this.config.scope,
        state: state,
        code_challenge: getCodeChallenge(codeVerifier),
        code_challenge_method: "S256",
      }, additionalParams);
      return this.config.serverUrl + "/login/oauth/authorize?" + buildQuery(params);
    });
  }

  getSignupUrl(additionalParams) {
    return this.getSigninUrl(additionalParams).then((url) => url.replace("/login/oauth/authorize", "/signup/oauth/authorize"));
  }

  getUserProfileUrl(userName) {
    const accessToken = this.getAccessToken();
    const params = accessToken ? "?access_token=" + encodeURIComponent(accessToken) : "";
    return this.config.serverUrl + "/users/" + this.config.organizationName + "/" + userName + params;
  }

  getMyProfileUrl(returnUrl) {
    const query = buildQuery({access_token: this.getAccessToken(), returnUrl: returnUrl});
    return this.config.serverUrl + "/account" + (query ? "?" + query : "");
  }

  // H5 leaves the page, so the promise only settles on the other platforms
  signin(options) {
    return this.authorize(false, options);
  }

  signup(options) {
    return this.authorize(true, options);
  }

  authorize(isSignup, options) {
    const opts = options || {};
    const platform = this.getPlatform();
    if (platform === "mp-weixin") {
      return this.signinWithWechatMiniProgram(opts);
    }
    if (platform !== "web" && platform !== "app") {
      return Promise.reject(createError("unsupported_platform", "signin() is not supported on platform: " + platform));
    }

    const urlPromise = isSignup ? this.getSignupUrl(opts.additionalParams) : this.getSigninUrl(opts.additionalParams);
    return urlPromise.then((url) => {
      if (platform === "web") {
        window.location.href = url;
        return new Promise(() => {});
      }
      return this.openAppWebview(url, opts).then((callbackUrl) => this.handleCallback(callbackUrl));
    });
  }

  // App: shows the sign-in page in a native webview and catches the navigation to the redirect URI
  openAppWebview(url, options) {
    const redirectUri = this.getRedirectUri();
    return new Promise((resolve, reject) => {
      let finished = false;
      const webview = plus.webview.create(url, APP_WEBVIEW_ID, {
        popGesture: "close",
        titleNView: {titleText: options.title || "Sign in", autoBackButton: true},
      });
      webview.overrideUrlLoading({mode: "reject", match: "^" + escapeRegExp(redirectUri) + ".*"}, (event) => {
        if (finished) {
          return;
        }
        finished = true;
        webview.close();
        resolve(event.url);
      });
      webview.addEventListener("close", () => {
        if (!finished) {
          finished = true;
          reject(createError("cancelled", "the sign-in page was closed"));
        }
      });
      webview.show("slide-in-right");
    });
  }

  isCallback(url) {
    const target = url || (typeof window !== "undefined" && window.location ? window.location.href : "");
    const params = parseUrlParams(target);
    return params.state !== undefined && (params.code !== undefined || params.error !== undefined);
  }

  // Finishes the sign-in from the redirect URL: checks the state and exchanges the code for a token.
  // Without a URL it reads the address of the H5 page, and resolves to null when it is not a callback.
  handleCallback(url) {
    const fromLocation = !url;
    const target = url || (typeof window !== "undefined" && window.location ? window.location.href : "");
    if (!this.isCallback(target)) {
      return Promise.resolve(null);
    }

    const params = parseUrlParams(target);
    const authRequest = this.readStorage(AUTH_REQUEST_KEY);
    this.storage.removeItem(AUTH_REQUEST_KEY);
    if (fromLocation && typeof window !== "undefined" && window.history && window.history.replaceState) {
      window.history.replaceState(null, "", removeUrlParams(target, ["code", "state", "iss", "session_state", "error", "error_description"]));
    }

    if (!authRequest || !authRequest.state || authRequest.state !== params.state) {
      return Promise.reject(createError("invalid_state", "invalid state parameter"));
    }
    if (params.error) {
      return Promise.reject(createError(params.error, params.error + ": " + (params.error_description || "")));
    }
    return this.exchangeCode(params.code, authRequest.codeVerifier, authRequest.redirectUri);
  }

  exchangeCode(code, codeVerifier, redirectUri) {
    return this.requestToken({
      grant_type: "authorization_code",
      client_id: this.config.clientId,
      code: code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    }).then((token) => this.saveToken(token));
  }

  // Casdoor's WeChat Mini Program login: the application needs a WeChat Mini Program provider
  signinWithWechatMiniProgram(options) {
    const opts = options || {};
    return new Promise((resolve, reject) => {
      uni.login({
        provider: "weixin",
        success: (res) => resolve(res.code),
        fail: (err) => reject(createError("wechat_login_failed", (err && err.errMsg) || "uni.login failed")),
      });
    }).then((code) => this.requestToken({
      tag: "wechat_miniprogram",
      client_id: this.config.clientId,
      code: code,
      username: opts.username,
      avatar: opts.avatar,
    })).then((token) => this.saveToken(token));
  }

  refreshToken() {
    const token = this.getToken();
    if (!token || !token.refresh_token) {
      return Promise.reject(createError("no_refresh_token", "there is no refresh token"));
    }
    return this.requestToken({
      grant_type: "refresh_token",
      client_id: this.config.clientId,
      refresh_token: token.refresh_token,
      scope: token.scope || this.config.scope,
    }).then((refreshed) => this.saveToken(Object.assign({refresh_token: token.refresh_token}, refreshed)));
  }

  getUserInfo() {
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      return Promise.reject(createError("not_signed_in", "there is no access token"));
    }
    return this.request({
      url: "/api/userinfo",
      method: "GET",
      header: {Authorization: "Bearer " + accessToken},
    }).then((res) => {
      const data = res.data;
      if (!data || typeof data !== "object" || data.status === "error" || res.statusCode >= 400) {
        const message = (data && (data.msg || data.error_description || data.error)) || "HTTP " + res.statusCode;
        throw createError("userinfo_failed", message);
      }
      return data;
    });
  }

  // Removes the local token and revokes it in Casdoor. On H5, pass postLogoutRedirectUri to also
  // end the Casdoor browser session: the page then goes to Casdoor and comes back to that URI.
  logout(options) {
    const opts = options || {};
    const token = this.getToken();
    this.storage.removeItem(TOKEN_KEY);
    this.storage.removeItem(AUTH_REQUEST_KEY);
    if (!token) {
      return Promise.resolve();
    }

    const params = {id_token_hint: token.id_token || token.access_token};
    if (opts.postLogoutRedirectUri && this.getPlatform() === "web") {
      params.post_logout_redirect_uri = opts.postLogoutRedirectUri;
      params.state = opts.state;
      window.location.href = this.config.serverUrl + "/api/logout?" + buildQuery(params);
      return new Promise(() => {});
    }

    return this.request({
      url: "/api/logout",
      method: "POST",
      header: {"content-type": "application/x-www-form-urlencoded"},
      data: buildQuery(params),
    }).then(() => undefined, () => undefined);
  }
}
