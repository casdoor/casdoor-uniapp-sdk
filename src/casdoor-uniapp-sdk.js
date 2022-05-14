// Copyright 2022 The Casdoor Authors. All Rights Reserved.
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

import Sdk from "casdoor-js-sdk";

export default {
  install(app, params) {
    let CasdoorSDK = new Sdk(params);
    if (app.version.charAt(0) === '2') {
      app.prototype.getSigninUrl = () => {
        return CasdoorSDK.getSigninUrl();
      }

      app.prototype.getSignupUrl = (enablePassword) => {
        return CasdoorSDK.getSignupUrl(enablePassword);
      }

      app.prototype.getUserProfileUrl = (userName, account) => {
        return CasdoorSDK.getUserProfileUrl(userName, account);
      }

      app.prototype.getMyProfileUrl = (account) => {
        return CasdoorSDK.getMyProfileUrl(account);
      }

      app.prototype.signin = (serverUrl) => {
        return CasdoorSDK.signin(serverUrl);
      }
    } else {
      app.config.globalProperties.getSigninUrl = () => {
        return CasdoorSDK.getSigninUrl();
      }

      app.config.globalProperties.getSignupUrl = (enablePassword) => {
        return CasdoorSDK.getSignupUrl(enablePassword);
      }

      app.config.globalProperties.getUserProfileUrl = (userName, account) => {
        return CasdoorSDK.getUserProfileUrl(userName, account);
      }

      app.config.globalProperties.getMyProfileUrl = (account) => {
        return CasdoorSDK.getMyProfileUrl(account);
      }

      app.config.globalProperties.signin = (serverUrl) => {
        return CasdoorSDK.signin(serverUrl);
      }
    }
  }
}
