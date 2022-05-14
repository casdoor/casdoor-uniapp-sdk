# casdoor-uniapp-sdk

This is Casdoor's SDK for js will allow you to easily connect your application to the Casdoor authentication system
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

```javascript
// in main.js
import Vue from 'vue'

Vue.use(Sdk, {
  serverUrl: "https://door.casbin.com",
  clientId: "014ae4bd048734ca2dea",
  organizationName: "casbin",
  appName: "app-casnode",
  redirectPath: "/callback",
})
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
			this.loginUrl = this.getSigninUrl();	
		}
	}
</script>
```