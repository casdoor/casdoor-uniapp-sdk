# casdoor-uniapp-sdk

[![NPM version][npm-image]][npm-url]
[![NPM download][download-image]][download-url]
[![codebeat badge](https://codebeat.co/badges/6f2ad052-7fc8-42e1-b40f-0ca2648530c2)](https://codebeat.co/projects/github-com-casdoor-casdoor-uniapp-sdk-master)
[![GitHub Actions](https://github.com/casdoor/casdoor-uniapp-sdk/actions/workflows/release.yml/badge.svg)](https://github.com/casdoor/casdoor-uniapp-sdk/actions/workflows/release.yml)
[![GitHub Actions](https://github.com/casdoor/casdoor-uniapp-sdk/actions/workflows/build.yml/badge.svg)](https://github.com/casdoor/casdoor-uniapp-sdk/actions/workflows/build.yml)
[![Coverage Status](https://codecov.io/gh/casdoor/casdoor-uniapp-sdk/branch/master/graph/badge.svg)](https://codecov.io/gh/casdoor/casdoor-uniapp-sdk)
[![Release](https://img.shields.io/github/release/casdoor/casdoor-uniapp-sdk.svg)](https://github.com/casdoor/casdoor-uniapp-sdk/releases/latest)
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/casbin/casdoor)

[npm-image]: https://img.shields.io/npm/v/casdoor-uniapp-sdk.svg?style=flat-square
[npm-url]: https://npmjs.com/package/casdoor-uniapp-sdk
[download-image]: https://img.shields.io/npm/dm/casdoor-uniapp-sdk.svg?style=flat-square
[download-url]: https://npmjs.com/package/casdoor-uniapp-sdk

This is Casdoor's SDK for uniapp will allow you to easily connect your application to the Casdoor authentication system
without having to implement it from scratch.

## Install

~~~shell script
# NPM
npm i casdoor-uniapp-sdk

# Yarn
yarn add casdoor-uniapp-sdk
~~~

## Parameters

Initialization requires 5 parameters, which are all string type:

| Name (in order)  | Must | Description                                         |
| ---------------- | ---- | --------------------------------------------------- |
| serverUrl  | Yes  | your Casdoor server URL               |
| clientId         | Yes  | the Client ID of your Casdoor application                        |
| appName           | Yes  | the name of your Casdoor application |
| organizationName     | Yes  | the name of the Casdoor organization connected with your Casdoor application                    |
| redirectPath     | No  | the path of the redirect URL for your Casdoor application, will be `/callback` if not provided              |


## Guide

### For uniapp-vue3:

```javascript
// in main.js
import App from './App'

// #ifndef VUE3
import Vue from 'vue'
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
    ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
import Sdk from './casdoor-uniapp-sdk.js'
export function createApp() {
  const app = createSSRApp(App)
  app.use(Sdk, {
  serverUrl: "https://door.casbin.com",
  clientId: "014ae4bd048734ca2dea",
  organizationName: "casbin",
  appName: "app-casnode",
  redirectPath: "/callback",
})
  return {
    app
  }
}
// #endif
```

### For uniapp-vue2:

```javascript
import App from './App'

// #ifndef VUE3
import Vue from 'vue'
import Sdk from './casdoor-uniapp-sdk.js'
Vue.config.productionTip = false
Vue.use(Sdk, {
  serverUrl: "https://door.casbin.com",
  clientId: "014ae4bd048734ca2dea",
  organizationName: "casbin",
  appName: "app-casnode",
  redirectPath: "/callback",
})
App.mpType = 'app'
const app = new Vue({
    ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
export function createApp() {
  const app = createSSRApp(App)
  return {
    app
  }
}
// #endif
```

## Example

```vue
// in pages/index/index.vue
<script>
export default {
 methods:{
  login(){				
   uni.navigateTo({
    url: `./webpage?path=${this.getSigninUrl()}`
   })
  }
 }
}
</script>
```
