# casdoor-uniapp-sdk

This is Casdoor's SDK for uniapp will allow you to easily connect your application to the Casdoor authentication system
without having to implement it from scratch.

Casdoor SDK is very simple to use. We will show you the steps below.

> Noted that this sdk has been applied to casnode, if you still don’t know how to use it after reading README.md, you can refer to it

## Installation

~~~shell script
# NPM
npm i casdoor-uniapp-sdk

# Yarn
yarn add casdoor-uniapp-sdk
~~~

## Init SDK

Initialization requires 5 parameters, which are all string type:

| Name (in order)  | Must | Description                                         |
| ---------------- | ---- | --------------------------------------------------- |
| serverUrl  | Yes  | your Casdoor server URL               |
| clientId         | Yes  | the Client ID of your Casdoor application                        |
| appName           | Yes  | the name of your Casdoor application |
| organizationName     | Yes  | the name of the Casdoor organization connected with your Casdoor application                    |
| redirectPath     | No  | the path of the redirect URL for your Casdoor application, will be `/callback` if not provided              |


install:

For uniapp-vue3:
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

For uniapp-vue2:
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

example:

```vue
// in pages/index/index.vue
<script>
export default {
	data(){
		return {loginUrl: ''}
	},
	methods:{
		login(){				
			uni.navigateTo({
				url: `./webpage?path=${this.getSigninUrl()}`
			})
		}
	}
</script>
```