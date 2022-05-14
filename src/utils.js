function SdkConfig(serverUrl, clientId, appName, organizationName, redirectPath){
	this.serverUrl = serverUrl; // your Casdoor server URL, e.g., "https://door.casbin.com" for the official demo site
	this.clientId = clientId;   // the Client ID of your Casdoor application, e.g., "014ae4bd048734ca2dea"
	this.appName = appName;     // the name of your Casdoor application, e.g., "app-casnode"
	this.organizationName = organizationName; // the name of the Casdoor organization connected with your Casdoor application, e.g., "casbin"
	this.redirectPath = redirectPath; // the path of the redirect URL for your Casdoor application, will be "/callback" if not provided
}

// reference: https://github.com/casdoor/casdoor-go-sdk/blob/90fcd5646ec63d733472c5e7ce526f3447f99f1f/auth/jwt.go#L19-L32
function Account(organization, username, 
				 type, name, avatar, email, 
				 phone, affiliation, tag, 
				 language, score, isAdmin, 
				 accessToken) {
					 
    this.organization = organization;
    this.username = username;
    this.type = type;
    this.name = name;
    this.avatar = avatar;
    this.email = email;
    this.phone = phone;
    this.affiliation = affiliation;
    this.tag = tag;
    this.language = language;
    this.score = score;
    this.isAdmin = isAdmin;
    this.accessToken = accessToken;
}

class Sdk {
    constructor(config) {
        this.config = config
        if (config.redirectPath === undefined || config.redirectPath === null) {
            this.config.redirectPath = "/callback";
        }
    }
	
	getSignupUrl(enablePassword){
	        if (enablePassword) {
	            return `${this.config.serverUrl.trim()}/signup/${this.config.appName}`;
	        } else {
	            return this.getSigninUrl().replace("/login/oauth/authorize", "/signup/oauth/authorize");
	        }
	}

    getSigninUrl(){
        const redirectUri = `${window.location.origin}${this.config.redirectPath}`;
        const scope = "read";
        const state = this.config.appName;
        return `${this.config.serverUrl.trim()}/login/oauth/authorize?client_id=${this.config.clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
    }

    getUserProfileUrl(userName, account){
        let param = "";
        if (account !== undefined && account !== null) {
            param = `?access_token=${account.accessToken}`;
        }
        return `${this.config.serverUrl.trim()}/users/${this.config.organizationName}/${userName}${param}`;
    }

    getMyProfileUrl(account) {
        let param = "";
        if (account !== undefined && account !== null) {
            param = `?access_token=${account.accessToken}`;
        }
        return `${this.config.serverUrl.trim()}/account${param}`;
    }

    signin(serverUrl) {
        const params = new URLSearchParams(window.location.search);
        return fetch(`${serverUrl}/api/signin?code=${params.get("code")}&state=${params.get("state")}`, {
            method: "POST",
            credentials: "include",
        }).then(res => res.json());
    }
}

export {SdkConfig, Account, Sdk};