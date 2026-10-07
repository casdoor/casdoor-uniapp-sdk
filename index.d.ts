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

export interface SdkStorage {
  getItem(key: string): string | null | undefined;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SdkConfig {
  serverUrl: string;
  clientId: string;
  appName?: string;
  organizationName?: string;
  redirectPath?: string;
  redirectUri?: string;
  scope?: string;
  storage?: SdkStorage;
  platform?: string;
}

export interface Token {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  expires_at?: number;
  scope?: string;
}

export interface UserInfo {
  sub: string;
  iss?: string;
  aud?: string;
  preferred_username?: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
  phone?: string;
  address?: string;
  groups?: string[];
  roles?: string[];
  permissions?: string[];
  [key: string]: unknown;
}

export interface SigninOptions {
  additionalParams?: Record<string, string>;
  title?: string;
  username?: string;
  avatar?: string;
}

export interface LogoutOptions {
  postLogoutRedirectUri?: string;
  state?: string;
}

export class CasdoorSdk {
  constructor(config: SdkConfig);
  getPlatform(): string;
  getRedirectUri(): string;
  getSigninUrl(additionalParams?: Record<string, string>): Promise<string>;
  getSignupUrl(additionalParams?: Record<string, string>): Promise<string>;
  getUserProfileUrl(userName: string): string;
  getMyProfileUrl(returnUrl?: string): string;
  signin(options?: SigninOptions): Promise<Token>;
  signup(options?: SigninOptions): Promise<Token>;
  isCallback(url?: string): boolean;
  handleCallback(url?: string): Promise<Token | null>;
  exchangeCode(code: string, codeVerifier: string, redirectUri: string): Promise<Token>;
  signinWithWechatMiniProgram(options?: SigninOptions): Promise<Token>;
  getToken(): Token | null;
  getAccessToken(): string;
  isSignedIn(): boolean;
  isTokenExpired(): boolean;
  parseAccessToken(): Record<string, unknown>;
  refreshToken(): Promise<Token>;
  getUserInfo(): Promise<UserInfo>;
  logout(options?: LogoutOptions): Promise<void>;
}

export function parseJwt(token: string): Record<string, unknown>;
export function parseUrlParams(url: string): Record<string, string>;

declare const plugin: {
  install(app: any, config: SdkConfig | CasdoorSdk): void;
};

export default plugin;
