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


var messageContext = class messageContext {
  constructor(msg) {
		if(!msg || !isJson(msg)) return;
		this.log("Message Rec: @@@ " + JSON.stringify(msg));
	 	this.orgMessage = isJson(msg) ? JSON.stringify(msg) : msg;
	 	this.jMessage = isJson(msg) ? msg : JSON.parse(msg);
	 	this.signed = null;
	 	this.encrypted = null;
	 	this.routeHash = null;
	 	this.type = this.jMessage.type || null;
	 	this.action = this.jMessage.action || null;
	 	this.sha256 = this.action == "duplication-check" ? sha256_digest(this.orgMessage) : null;
	 	this.interval = this.action ? CliqzSecureMessage.sourceMap[this.action]["interval"] : null;
	 	this.rateLimit = this.action ? CliqzSecureMessage.sourceMap[this.action]["ratelimit"] : null;
	 	this.endPoint = this.action ? CliqzSecureMessage.sourceMap[this.action]["endpoint"] : null;
	 	this.mE = null;
	 	this.mK = null;
	 	this.mP = null;
	 	this.dm = null;
	 	this.proxyValidators = null;
  }

  log(msg){
  	if(CliqzSecureMessage.debug){
  		console.log("Message Context: " + msg);
  	}
  }

	getproxyCoordinator(){
		var _this = this;
		var msg = _this.jMessage;
		var promise = new Promise(function(resolve, reject){
			try{
				var hash = "";
				// var _msg = msg || this.orgMessage;
				var stringRouteHash = getRouteHash(msg);
				CliqzSecureMessage.sha1(stringRouteHash)
				.then(hashM => {
					var dmC = hexToBinary(hashM)['result'].slice(0,13);
					var routeHash = parseInt(dmC, 2);
					_this.fullHash = hashM;
					_this.dmC = dmC;
					var totalProxies = 4096;
					var modRoute = routeHash % totalProxies;
					var proxyIP = createHttpUrl(CliqzSecureMessage.routeTable[modRoute]);
					_this.proxyCoordinator = proxyIP;
					resolve(proxyIP);
				})
				.catch(err=>{
					reject(err);
				})


			}
			catch(e){
				reject(e);
			}
		})
		return promise;
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
				var signedKey = CliqzSecureMessage.secureLogger.keyObj.encrypt(messageToSign);
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