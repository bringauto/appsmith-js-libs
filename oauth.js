
export class OAuthRefreshToken {

	///
	/// Class variables are copy-paste from Appsmith OAuth2RefreshToken.js 
	///

	oauth2 = null;
	oauthMinimumAccessTokenLifetimeInmS = 10 * 1000;
	oauthServerMaxResponseTimeInmS = 10 * 1000;

	constructor(oauth2) {
		if(typeof oauth2 !== 'undefined') {
			throw new Error("Cannot create OAuth2RefreshToken class - OAuth2 instance is undefined");
		}
		if(typeof oauth2 !== 'OAuth2') {
			throw new Error("Cannot create OAuth2RefreshToken class");
		}
		this.oauth2 = oauth2;
	}

	async init() {
		this.setUpRefreshTimers();
	}

	//
	// Original init from appsmith dev app.
	// Donot forget to remove this.oauth2 line!
	//
	//async init() {
	//	this.oauth2 = OAuth2;
	//	this.setUpRefreshTimers();
	//}

	///
	/// Following code is just a copy code from Appsmith OAuth2RefreshToken object
	///

	setUpRefreshTimers() {
		const refreshTokenCallback = () => {
			if(!appsmith.store.token) {
				clearInterval('OAuthRefreshTimer');
				setInterval(refreshTokenCheckCallback, this.oauthMinimumAccessTokenLifetimeInmS, "OAuthRefreshCheckTimer");
				return;
			}
			console.log("TIMER: token refresh");
			this.oauth2.refreshAccessToken();
		};
		const refreshTokenCheckCallback = () => {
			if(!appsmith.store.token) {
				console.log("TIMER: No token to refresh");
				return;
			}
			console.log("TIMER: token refresh - timer started");
			var period = this.computeAccessTokenRefreshPeriod(appsmith.store.token['expires_in']);
			console.info("TIME: refresh period " + period);
			clearInterval("OAuthRefreshCheckTimer");
			setInterval(refreshTokenCallback, period, "OAuthRefreshTimer");
		};
		clearInterval("OAuthRefreshCheckTimer");
		clearInterval('OAuthRefreshTimer');

		// Lets refresh token to get maximum lifetime possible before timer starts.
		refreshTokenCallback();
		setInterval(refreshTokenCheckCallback, this.oauthMinimumAccessTokenLifetimeInmS, "OAuthRefreshCheckTimer");
	}

	computeAccessTokenRefreshPeriod(expires_in) {
		if(!expires_in) {
			expires_in = this.oauthMinimumAccessTokenLifetimeInmS / 1000;
		}
		console.log("expiresIn arg: " + expires_in);
		return Math.max((expires_in * 1000 - this.oauthServerMaxResponseTimeInmS), this.oauthMinimumAccessTokenLifetimeInmS);
	}
}

export class OAuth {

	///
	/// Class variables are copy-pase from Appsmith OAuth2.js 
	///

	redirectUri  = null;
	issuerUrl    = null;
	clientSecret = null;
	clientId     = null;

	oauthClientParams = {
		client_id: null,
		client_secret: null,
		token_endpoint_auth_method: 'client_secret_basic',
	};

	exmapleConfig = {
		client_id:       "",
		client_secret:   "",
		issuer_url:      "",
		redirect_uri:    "",
		oauth_webapi_js: null,
	};

	/**
	 * Constructor is defined only as part of the class not part of the Appsmith test app 
	 * @param {Object} config
	 */
	constructor(config) { //clientId, clientSecret, issuerUrl, redirectUri) {
		this.clientId = config.client_id;
		this.clientSecret = config.client_secret;
		this.issuerUrl = config.issuer_url;
		this.redirectUri = config.redirect_uri;
		this.oauth_webapi_js = config.oauth_webapi_js;
		this.oauthClientParams.client_id = config.client_id
		this.oauthClientParams.client_secret = config.client_secret;
	}

	///
	/// Specific for the class
	///

	/**
	 * 
	 * @returns OAuthRefreshToken object
	 */
	getRefreshTokenObject() {
		return new OAuthRefreshToken(this);
	}

	///
	/// Following code is just a copy code from Appsmith OAuth2 object
	///

	async getDiscoveryObject() {
		const issuer = new URL(this.issuerUrl);
		return await oauth_webapi_js.discoveryRequest(issuer, { algorithm: 'oidc' })
			.then((response) => oauth_webapi_js.processDiscoveryResponse(issuer, response));
	}

	async getAutorizationUrl () {
		const code_challenge_method = 'S256';
		const as = await this.getDiscoveryObject();

		const code_verifier = oauth_webapi_js.generateRandomCodeVerifier();
		const code_challenge = await oauth_webapi_js.calculatePKCECodeChallenge(code_verifier);

		// redirect user to as.authorization_endpoint
		const authorizationUrl = new URL(as.authorization_endpoint);
		authorizationUrl.searchParams.set('client_id', this.clientId);;
		authorizationUrl.searchParams.set('redirect_uri', this.redirectUri);
		authorizationUrl.searchParams.set('response_type', 'code');
		authorizationUrl.searchParams.set('scope', 'openid profile email');
		authorizationUrl.searchParams.set('code_challenge', code_challenge);
		authorizationUrl.searchParams.set('code_challenge_method', code_challenge_method);

		var nonce = oauth_webapi_js.generateRandomNonce();
		authorizationUrl.searchParams.set('nonce', nonce);

		storeValue("oauth_nonce", nonce);
		storeValue("oath_code_verifier", code_verifier);

		console.info("AuthorizationURL: " + authorizationUrl.toString());
		return authorizationUrl.toString();
	}

	async processAuthCode() {
		const as = await this.getDiscoveryObject();

		const currentUrl = new URL(appsmith.URL.fullPath);
		console.log(as);
		const params = oauth_webapi_js.validateAuthResponse(as, this.oauthClientParams, currentUrl);
		console.log(params);
		if (oauth_webapi_js.isOAuth2Error(params)) {
			console.error('validateAuthResponse failed. Error Response', params);
			throw new Error(); // Handle OAuth 2.0 redirect error
		}

		const code_verifier = appsmith.store.oath_code_verifier;
		const response = await oauth_webapi_js.authorizationCodeGrantRequest(
			as,
			this.oauthClientParams,
			params,
			this.redirectUri,
			code_verifier,
		);

		var challenges = oauth_webapi_js.parseWwwAuthenticateChallenges(response);
		if (challenges) {
			for (const challenge of challenges) {
				console.error('WWW-Authenticate Challenge', challenge);
			}
			throw new Error();
		}

		const nonce = appsmith.store.oauth_nonce;
		const result = await oauth_webapi_js.processAuthorizationCodeOpenIDResponse(as, this.oauthClientParams, response, nonce);
		if (oauth_webapi_js.isOAuth2Error(result)) {
			console.error('processAuthorizationCodeOpenIDResponse failed. Error Response', result);
			throw new Error(); // Handle OAuth 2.0 response body error
		}

		console.log('Access Token Response', result);

		// Clear storage to get rid of all leftovers and store token
		clearStore();
		storeValue("token", result);
	}

	async refreshAccessToken() {
		if(!appsmith.store.token) {
			throw new Error("cannot refresh non existent token!");
		}

		const refresh_token = appsmith.store.token['refresh_token'];
		const as            = await this.getDiscoveryObject();
		const response      = await oauth_webapi_js.refreshTokenGrantRequest(as, this.oauthClientParams, refresh_token)

		var challenges = oauth_webapi_js.parseWwwAuthenticateChallenges(response);
		if (challenges) {
			for (const challenge of challenges) {
				console.error('WWW-Authenticate Challenge', challenge)
			}
			throw new Error() // Handle WWW-Authenticate Challenges as needed
		}

		const result = await oauth_webapi_js.processRefreshTokenResponse(as, this.oauthClientParams, response)
		if (oauth_webapi_js.isOAuth2Error(result)) {
			console.error('Error Response', result)
			throw new Error() // Handle OAuth 2.0 response body error
		}

		console.log('Access Token Response', result);

		//
		// There is no need to clear storage in token refresh
		//
		storeValue("token", result);
	}

};
