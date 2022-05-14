import Sdk from "casdoor-js-sdk";

export default{
	install(app, params) {
		let CasdoorSDK = new Sdk(params);
		if(app.version.charAt(0) === '2'){
	
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
		else {
			app.config.globalProperties.getSigninUrl = () =>{
				return CasdoorSDK.getSigninUrl();
			}
			
			app.config.globalProperties.getSignupUrl = (enablePassword) =>{
				return CasdoorSDK.getSignupUrl(enablePassword);
			}
			
			app.config.globalProperties.getUserProfileUrl = (userName, account) =>{
				return CasdoorSDK.getUserProfileUrl(userName, account);
			}
			
			app.config.globalProperties.getMyProfileUrl = (account) =>{
				return CasdoorSDK.getMyProfileUrl(account);
			}
			
			app.config.globalProperties.signin = (serverUrl) =>{
				return CasdoorSDK.signin(serverUrl);
			}
		}
	}
}