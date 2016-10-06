/* This method will ensure that we have the same length for all the mesages
*/
function padMessage(msg){
	const mxLen = 14000;
	var padLen = (mxLen - msg.length) + 1;
	if (padLen < 0) {
		throw 'msgtoobig';
	}
	return msg + new Array(padLen).join("\n");
}

function isJson(str) {
// If can be parsed that means it's a str.
// If cannot be parsed and is an object then it's a JSON.
  try {
      JSON.parse(str);
  } catch (e) {
  	if(typeof str =='object')
      return true;
  }
  return false;
}

function getRandomWords(){
	return crypto.getRandomValues(new Int32Array(4));
}

var JsonFormatter = {
	stringify: function (cipherParams) {
        // create json object with ciphertext
        var jsonObj = {
        	ct: cipherParams.ciphertext.toString(CryptoJS.enc.Base64)
        };

        // optionally add iv and salt
        if (cipherParams.iv) {
        	jsonObj.iv = cipherParams.iv.toString();
        }
        if (cipherParams.salt) {
        	jsonObj.s = cipherParams.salt.toString();
        }

        // stringify json object
        return JSON.stringify(jsonObj);
      },

      parse: function (jsonStr) {
        // parse json string
        var jsonObj = JSON.parse(jsonStr);

        // extract ciphertext from json object, and create cipher params object
        var cipherParams = CryptoJS.lib.CipherParams.create({
        	ciphertext: CryptoJS.enc.Base64.parse(jsonObj.ct)
        });

        // optionally extract iv and salt
        if (jsonObj.iv) {
        	cipherParams.iv = CryptoJS.enc.Hex.parse(jsonObj.iv);
        }
        if (jsonObj.s) {
        	cipherParams.salt = CryptoJS.enc.Hex.parse(jsonObj.s);
        }

        return cipherParams;
      }
};

var sourceMap = {"alive":{"keys":["action","payload.t"],"endpoint":"safe-browsing"},"page":{"keys":["payload.url","ts"],"endpoint":"safe-browsing"},"query":{"keys":["payload.q","ts"],"endpoint":"safe-browsing"},"ads_A":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"},"ads_B":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"},"ads_C":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"},"doorwaypage":{"keys":["action","payload.url","payload.durl"],"endpoint":"safe-browsing"},"linkedin":{"keys":["action","payload.profileLink","ts"],"endpoint":"safe-browsing"},"suspiciousurl":{"keys":["action","payload.qurl","ts"],"endpoint":"safe-browsing"},"maliciousUrl":{"keys":["action","payload.qurl","ts"],"endpoint":"safe-browsing"},"extension-query":{"keys":["ts"],"endpoint":"query"},"extension-result-telemetry":{"keys":["ts"],"endpoint":"query-telemetry"},"attrack.tokens":{"keys":["action","ts","payload"],"endpoint":"safe-browsing"},"attrack.tp_events":{"keys":["action","ts","payload.data[0].hostname","payload.data[0].path"],"bkeys":["action","ts","payload.data.1.hostname","payload.data.1.path"],"endpoint":"safe-browsing"},"attrack.safekey":{"keys":["action","payload.ts"],"endpoint":"safe-browsing"},"attrack.fp":{"keys":["action","payload.ts"],"endpoint":"safe-browsing"},"attrack.whitelistDomain":{"keys":["action","payload","ts"],"endpoint":"safe-browsing"},"proxy-health":{"keys":["action","anti-duplicates"],"endpoint":"health-stats"},"test-message":{"keys":["action","anti-duplicates"],"endpoint":"health-stats"},"hw.telemetry.actionstats":{"keys":["action","ts"],"endpoint":"safe-browsing"},"ga-watchdog-experiment":{"keys":["action","ts","payload.r"],"endpoint":"safe-browsing-experiment"},"locdata":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"},"ads_D":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"}}

var messageContext = class messageContext {
  constructor(msg) {
		if(!msg || !isJson(msg)) return;
		this.log("Message Rec: " + JSON.stringify(msg));
	 	this.orgMessage = isJson(msg) ? JSON.stringify(msg) : msg;
	 	this.jMessage = isJson(msg) ? msg : JSON.parse(msg);
	 	this.signed = null;
	 	this.encrypted = null;
	 	this.routeHash = null;
	 	this.type = this.jMessage.type || null;
	 	this.action = this.jMessage.action || null;
	 	this.sha256 = this.action == "duplication-check" ? sha256_digest(this.orgMessage) : null;
	 	this.interval = this.action ? sourceMap[this.action]["interval"] : null;
	 	this.rateLimit = this.action ? sourceMap[this.action]["ratelimit"] : null;
	 	this.endPoint = this.action ? sourceMap[this.action]["endpoint"] : null;
	 	this.mE = null;
	 	this.mK = null;
	 	this.mP = null;
	 	this.dm = null;
	 	// this.dmC =  this.action !== "extension-query" ? this.calculateRouteHash(this.jMessage) : null;
	 	// this.proxyCoordinator = this.action != "extension-query" ? this.getProxyIP(this.dmC) :null;
	 	this.proxyValidators = null;
	 	this.secureLogger = new secureLogger(); // This needs to only on initialization
  }

  log(msg){
  	if(HPN.DEBUG){
  		console.log("Message Context: " + msg);
  	}
  }

	/**
	 * Method to parse a message and encrypt with AES.
	 * @throws {string} Will throw 'msgtoobig' if message size exceeds a threshold.
	 * @returns string of AES encrypted message.
	 */
	aesEncrypt(t){
		var _this = this;
		var promise = new Promise(function(resolve, reject){
			try{
				var salt = CryptoJS.lib.WordArray.create(getRandomWords());
				var iv = CryptoJS.enc.Hex.parse(salt.toString());
			    var eventID = ('' + iv).substring(0,5);
			    var encryptionPaylod = {};
			    encryptionPaylod['msg'] = _this.orgMessage;
			    encryptionPaylod['endpoint'] = _this.endPoint;
			    var msgEncrypt = padMessage(JSON.stringify(encryptionPaylod), t);
			    var key = CryptoJS.lib.WordArray.create(getRandomWords(4));
			    // var encrypted = CryptoJS.AES.encrypt(_this.orgMessage, key, {iv:iv});
			    var encrypted = CryptoJS.AES.encrypt(msgEncrypt, key, {iv:iv});
			    _this.log(eventID);
			    _this.eventID = eventID;
			    _this.aesKey = '' + key;
				_this.encryptedMessage = encrypted.toString();
				_this.iv = encrypted.iv.toString(CryptoJS.enc.Hex);
				// _this.messageToSign = key + ";" + encrypted.iv + ";" + "instant;cPK;endPoint";
				_this.mE = encrypted.toString();
				_this.mID = eventID;
				_this.key = key;
				resolve(_this.mE);
			}
			catch(e){
				reject(e);
			}
		})

		return promise;
	}

	/**
	 * Method to parse a message and decrypt with AES.
	 * @returns string of AES decrypted message.
	 */
	aesDecrypt(msg){
		var _this = this;
		var promise = new Promise(function(resolve, reject){
			try{
				var encryptedMsg = msg.split(";")[1];
				var eventID = msg.split(";")[0];
				var key = _this.aesKey;//CliqzSecureMessage.eventID[eventID]["key"];// _this.aesKey;
				var iv = _this.iv;//CliqzSecureMessage.eventID[eventID]["iv"];// _this.iv;
				var decrypted = CryptoJS.AES.decrypt(
	  				{ciphertext: CryptoJS.enc.Base64.parse(encryptedMsg) },
	  				CryptoJS.enc.Hex.parse(key),
	  				{ iv: CryptoJS.enc.Hex.parse(iv),format: JsonFormatter }
				);
				resolve(decrypted.toString(CryptoJS.enc.Utf8));

			}
			catch(e){
				_this.log(e + " >>>>>>>> Error in decrypt >>>>>>");
				reject(e);
			}
		})

		return promise;
	}

	/**
	 * Method to sign the AES encryptiong key with Aggregator Public key.
	 * Calculate mK = {AESKey;iv;endPoint}
	 * @returns string of encrypted key.
	 */
	signKey(){
		var aesKey = this.aesKey.toString(CryptoJS.enc.Base64);
		var _this = this;
		var promise = new Promise(function(resolve, reject){
			try{
				// To protect from padding oracle attacks, we need to send the hash of
				// mE.
				var mI = '' + CryptoJS.MD5(_this.mE);
				var messageToSign = _this.key + ";" + _this.iv + ";endPoint;" + mI;
				var signedKey = _this.secureLogger.keyObj.encrypt(messageToSign);
				_this.signedKey = signedKey;
				_this.mK = signedKey;
				resolve(signedKey);
			}
			catch(e){
				reject(e);
			}
		})
		return promise;
	}

	/**
	 * Method to create MP
	 * Calculate mP = <mID, mK, mE>
	 * @returns string called mP.
	 */
	getMP(){
		var mP = this.mID + ";" + this.mK +";" + this.mE;
		this.mP = mP;
		return mP
	}
};