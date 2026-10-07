# casdoor-uniapp-sdk

[![NPM version][npm-image]][npm-url]
[![NPM download][download-image]][download-url]
[![Build](https://github.com/casdoor/casdoor-uniapp-sdk/actions/workflows/build.yml/badge.svg)](https://github.com/casdoor/casdoor-uniapp-sdk/actions/workflows/build.yml)
[![Release](https://github.com/casdoor/casdoor-uniapp-sdk/actions/workflows/release.yml/badge.svg)](https://github.com/casdoor/casdoor-uniapp-sdk/actions/workflows/release.yml)
[![Coverage Status](https://codecov.io/gh/casdoor/casdoor-uniapp-sdk/branch/master/graph/badge.svg)](https://codecov.io/gh/casdoor/casdoor-uniapp-sdk)
[![License](https://img.shields.io/github/license/casdoor/casdoor-uniapp-sdk)](https://github.com/casdoor/casdoor-uniapp-sdk/blob/master/LICENSE)
[![Discord](https://img.shields.io/discord/1022748306096537660?logo=discord&label=discord&color=5865F2)](https://discord.gg/5rPsrAzK7S)

[npm-image]: https://img.shields.io/npm/v/casdoor-uniapp-sdk.svg?style=flat-square
[npm-url]: https://npmjs.com/package/casdoor-uniapp-sdk
[download-image]: https://img.shields.io/npm/dm/casdoor-uniapp-sdk.svg?style=flat-square
[download-url]: https://npmjs.com/package/casdoor-uniapp-sdk

[Casdoor](https://casdoor.ai/) SDK for [uni-app](https://uniapp.dcloud.net.cn/) (Vue 2 and Vue 3). It signs users in from the app itself, without a backend:

- OAuth 2.0 authorization code flow with PKCE (S256) and a random `state`, no client secret in the app
- token exchange, user info, token refresh and logout
- only uni APIs (`uni.request`, `uni.setStorageSync`, ...), no browser globals, so the same code runs on every platform

| Platform | How the user signs in |
|---|---|
| H5 | the page goes to the Casdoor sign-in page, Casdoor redirects back with `code` and `state`, and `handleCallback()` finishes the sign-in |
| App (`app-plus`) | the Casdoor sign-in page opens in a webview; the SDK catches the navigation to the redirect URI, closes the webview and exchanges the code |
| WeChat Mini Program | Casdoor's [WeChat Mini Program login](https://casdoor.ai/docs/integration/javascript/wechat_miniprogram): `uni.login()` gets a code and Casdoor exchanges it with WeChat |

## Install

```shell
npm install casdoor-uniapp-sdk
# or
yarn add casdoor-uniapp-sdk
```

For a project created in HBuilderX, run the command in the project folder (create a `package.json` with `npm init -y` first if there is none).

## Casdoor setup

In your Casdoor application:

- **Redirect URLs**: add the redirect URI of each platform you use.
  - H5: your site and `redirectPath`, for example `https://app.example.com/callback`. While developing, `http://localhost/callback` matches every local port.
  - App: `http://localhost/callback` (the default `redirectUri` on App). The webview never loads it, so it doesn't have to exist.
- **Grant types**: keep `Authorization Code` and add `Refresh Token` if you use `refreshToken()`.
- WeChat Mini Program: add a provider of type **WeChat Mini Program** (AppID and AppSecret of the mini program) to the application, and add the Casdoor server to the mini program's request domains (`request合法域名`).

## Usage

Create the SDK once, for example in `src/casdoor.js`:

```js
import {CasdoorSdk} from "casdoor-uniapp-sdk";

export const casdoor = new CasdoorSdk({
  serverUrl: "https://door.casdoor.com",
  clientId: "014ae4bd048734ca2dea",
  organizationName: "casbin",
  appName: "app-casnode",
  redirectPath: "/callback",
});
```

Sign in, and on H5 finish the sign-in when the page is loaded again with `code` and `state`:

```vue
<script>
import {casdoor} from "../../casdoor.js";

export default {
  data() {
    return {user: null};
  },
  onLoad() {
    // H5: the page is loaded again after signing in on Casdoor
    casdoor.handleCallback()
      .then(() => this.loadUser())
      .catch((err) => uni.showToast({title: err.message, icon: "none"}));
  },
  methods: {
    signin() {
      // H5 leaves the page, App and WeChat Mini Programs resolve with the token
      casdoor.signin().then(() => this.loadUser());
    },
    loadUser() {
      if (casdoor.isSignedIn()) {
        casdoor.getUserInfo().then((user) => (this.user = user));
      }
    },
    logout() {
      casdoor.logout().then(() => (this.user = null));
    },
  },
};
</script>
```

`handleCallback()` resolves to `null` when the URL is not a callback, so it can be called on every load. On H5 the redirect URI is `location.origin + redirectPath`; with the default hash router, `/callback` serves the same `index.html`, so configure your web server to return `index.html` for that path.

You can also install the SDK as a Vue plugin, then pages use `this.$casdoor` (Vue 3 also provides it as `inject("casdoor")`):

```js
// Vue 3 (main.js)
import {createSSRApp} from "vue";
import Casdoor from "casdoor-uniapp-sdk";
import App from "./App.vue";

export function createApp() {
  const app = createSSRApp(App);
  app.use(Casdoor, {serverUrl: "https://door.casdoor.com", clientId: "014ae4bd048734ca2dea", organizationName: "casbin", appName: "app-casnode"});
  return {app};
}
```

```js
// Vue 2 (main.js)
import Vue from "vue";
import Casdoor from "casdoor-uniapp-sdk";
import App from "./App";

Vue.use(Casdoor, {serverUrl: "https://door.casdoor.com", clientId: "014ae4bd048734ca2dea", organizationName: "casbin", appName: "app-casnode"});
App.mpType = "app";
new Vue({...App}).$mount();
```

## Configuration

| Name | Required | Description |
|---|---|---|
| `serverUrl` | Yes | URL of your Casdoor server |
| `clientId` | Yes | Client ID of the Casdoor application |
| `organizationName` | No | Organization of the application, used by `getUserProfileUrl()` |
| `appName` | No | Name of the application |
| `redirectPath` | No | H5: path of the redirect URI on your site, `/callback` by default |
| `redirectUri` | No | Full redirect URI, overrides `redirectPath`. On App it defaults to `http://localhost/callback` |
| `scope` | No | `openid profile email` by default |
| `storage` | No | Object with `getItem`, `setItem` and `removeItem` to keep the token somewhere else than `uni.setStorageSync` |
| `platform` | No | Force the platform (`web`, `app`, `mp-weixin`), detected with `uni.getSystemInfoSync().uniPlatform` by default |

## API

| Method | Description |
|---|---|
| `signin(options?)` / `signup(options?)` | Signs the user in (or up) as described in the table above. Returns a promise of the token, except on H5 where the page leaves. `options.additionalParams` adds query parameters to the authorization URL, `options.title` is the App webview title, `options.username` and `options.avatar` are passed to the WeChat Mini Program login |
| `handleCallback(url?)` | Checks `state`, exchanges `code` with the PKCE verifier and stores the token. Reads the current H5 address when `url` is omitted, and removes `code` and `state` from it. Resolves to `null` if the URL isn't a callback |
| `getSigninUrl(params?)` / `getSignupUrl(params?)` | Promise of the authorization URL; stores the `state` and the code verifier for `handleCallback()` |
| `exchangeCode(code, codeVerifier, redirectUri)` | Exchanges an authorization code yourself |
| `signinWithWechatMiniProgram(options?)` | The WeChat Mini Program login on its own |
| `getUserInfo()` | Promise of the OIDC user info (`sub`, `name`, `preferred_username`, `email`, `picture`, ...) from `/api/userinfo` |
| `refreshToken()` | Gets a new access token with the refresh token and stores it |
| `logout(options?)` | Removes the token and revokes it in Casdoor. On H5, `options.postLogoutRedirectUri` also ends the Casdoor browser session by going to Casdoor and back |
| `getToken()`, `getAccessToken()`, `isSignedIn()`, `isTokenExpired()`, `parseAccessToken()` | Read the stored token |
| `getMyProfileUrl(returnUrl?)`, `getUserProfileUrl(userName)` | Links to the Casdoor account pages |

Errors are `Error` objects with a `code`: `invalid_state`, `cancelled` (the App webview was closed), `unsupported_platform`, `request_failed`, `not_signed_in`, `no_refresh_token`, `userinfo_failed`, `wechat_login_failed`, or the OAuth error from Casdoor (`invalid_grant`, `access_denied`, ...).

## Upgrading from 1.x

1.x wrapped casdoor-js-sdk, only worked on H5 and needed a backend to exchange the code. 2.x is a new implementation:

- `getSigninUrl()` now returns a promise, and uses a random `state` and PKCE instead of the application name as `state`.
- `signin(serverUrl)` is replaced by `signin()` + `handleCallback()`, which exchange the code in the app without a backend.
- The SDK no longer adds methods to every page; use the `CasdoorSdk` instance or `this.$casdoor`.
- The package is an ES module with no dependencies.

## Example

[casdoor-uniapp-example](https://github.com/casdoor/casdoor-uniapp-example) is a uni-app (Vue 3 + Vite) app that signs in with the public demo server and shows the user.

## License

[Apache-2.0](LICENSE)
