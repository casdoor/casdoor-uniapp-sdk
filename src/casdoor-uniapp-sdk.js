import {Sdk} from './utils.js'

export default{
	install(app, options) {
	    let CasdoorSDK = new Sdk(options);
	
		app.prototype.getSigninUrl = () =>{
			return CasdoorSDK.getSigninUrl();
		}
		
		app.prototype.getSignupUrl = (enablePassword) =>{
			return CasdoorSDK.getSignupUrl(enablePassword);
		}
		
		app.prototype.getUserProfileUrl = (userName, account) =>{
			return CasdoorSDK.getUserProfileUrl(userName, account);
		}
		
		app.prototype.getMyProfileUrl = (account) =>{
			return CasdoorSDK.getMyProfileUrl(account);
		}
		
		app.prototype.signin = (serverUrl) =>{
			return CasdoorSDK.signin(serverUrl);
		}
	}
}