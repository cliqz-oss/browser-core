/**
* Creates object for message recieved+
* Only excepts valid JSON messages with the following fields:
* Type : Humanweb / Antitracking etc.
* Actions : Valid actions like Page, query etc.
* @returns string with payload created.
*/

import { md5 } from 'md5';
// FIXME: remove circular dependency
import CliqzSecureMessage, { localTemporalUniq } from './index';
import userPK from './user-pk';

import { sha1 } from '../../core/crypto/utils';

import {
  fromBase64,
  toBase64,
  toUTF8,
  fromUTF8,
  fromHex,
  toHex
} from '../../core/encoding';

import {
  createPayloadBlindSignature,
  createPayloadProxy,
  getRouteHash,
  createHttpUrl
} from './utils';
import { unBlindMessage, blindSignContext } from './blind-signature';
import _http from './http-worker';

import crypto from '../../platform/crypto';

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

function hexToBinary(s) {
    var i, k, part, ret = '';
    // lookup table for easier conversion. '0' characters are padded for '1' to '7'
    var lookupTable = {
        '0': '0000', '1': '0001', '2': '0010', '3': '0011', '4': '0100',
        '5': '0101', '6': '0110', '7': '0111', '8': '1000', '9': '1001',
        'a': '1010', 'b': '1011', 'c': '1100', 'd': '1101',
        'e': '1110', 'f': '1111',
        'A': '1010', 'B': '1011', 'C': '1100', 'D': '1101',
        'E': '1110', 'F': '1111'
    };
    for (i = 0; i < s.length; i += 1) {
        if (lookupTable.hasOwnProperty(s[i])) {
            ret += lookupTable[s[i]];
        } else {
            return { valid: false };
        }
    }
    return { valid: true, result: ret };
}

export default class {
  constructor(msg) {
    // FIXME: isJson is called 3 times on same object
    // TODO: don't use isJSON - try / catch should be sufficient
  	if(!msg || !isJson(msg)) return;
    this.orgMessage = isJson(msg) ? JSON.stringify(msg) : msg;
    this.jMessage = isJson(msg) ? msg : JSON.parse(msg);
    this.signed = null;
    this.encrypted = null;
    this.routeHash = null;
    this.type = this.jMessage.type || null;
    this.action = this.jMessage.action || null;
    this.sha256 = null;
    this.interval = null;
    this.rateLimit = null;
    this.endPoint = null;
    this.mE = null;
    this.mK = null;
    this.mP = null;
    this.dm = null;
    this.proxyValidators = null;
  }

  log(msg){
    console.log("Message Context: " + msg);
  }

	getproxyCoordinator(){
		var _this = this;
		var msg = _this.jMessage;
    _this.endPoint = CliqzSecureMessage.sourceMap[this.action]["endpoint"];
    _this.md5Hash = md5(this.action);
		var promise = new Promise(function(resolve, reject){
			try{
				var hash = "";
				// var _msg = msg || this.orgMessage;
				var stringRouteHash = getRouteHash(msg);
				sha1(stringRouteHash)
				.then(hashM => {
          _this.sha1 = hashM;
					var dmC = hexToBinary(hashM)['result'].slice(0,13);
					var routeHash = parseInt(dmC, 2);
					_this.fullHash = hashM;
					_this.dmC = dmC;
					var totalProxies = 4096;
					var modRoute = routeHash % totalProxies;
					var proxyIP = createHttpUrl(CliqzSecureMessage.routeTable[modRoute]);
					_this.proxyCoordinator = proxyIP;
					resolve(this);
				})
				.catch(err=>{
          console.log("ERROR >> " + err);
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
	 * Method to generate an AES-CBC 128 bit key.
	 * @returns crypto object of AES KEY.
	 */
  aesGenerateKey(){
    let _this = this;
  	let promise = new Promise(function(resolve, reject){
      crypto.subtle.generateKey(
        {
            name: "AES-CBC",
            length: 128,
        },
        true,
        ["encrypt", "decrypt"]
      ).then( key => {
        resolve(key);
      }).catch( err => {
        console.log("Error in generating key: " + err);
        reject(err);
      });
  	})
    return promise;
  }

	/**
	 * Method to generate an AES-CBC 128 bit key.
	 * @returns crypto object of AES KEY.
	 */
	aesExportKey(key){
    let _this = this;
    let promise = new Promise(function(resolve, reject){
      crypto.subtle.exportKey('raw', key).then( result => {
        _this.aesKey = toHex(new Uint8Array(result));
        resolve(key);
      }).catch ( err => {
        console.log("Error in exporting key: " + err);
        reject(err);
      })
    });
    return promise;
	}
  /**
   * Method to parse a message and encrypt with AES.
   * @throws {string} Will throw 'msgtoobig' if message size exceeds a threshold.
   * @returns string of AES encrypted message.
   */
  aesEncryption( key, _iv, msgEncrypt ){
    let _this = this;
    let promise = new Promise(function(resolve, reject){
      crypto.subtle.encrypt(
        {
            name: "AES-CBC",
            iv: _iv,
        },
        key,
        toUTF8(msgEncrypt) //ArrayBuffer of data you want to encrypt
      ).then( encrypted => {
        resolve(encrypted);
      }).catch( err => {
        console.log("Error in aes encryption: " + err);
        reject(err);
      })
    })
    return promise;
  }

  rsaEncrypt(msg){
    let _this = this;
    let promise = new Promise(function(resolve, reject){
      //let publicKey = "MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAh5HhcRAn6+6woXQXl/NtZ+fOooNglZct/HSpYuqkcmrPauHW7EuOSq5bvpBZRTDROjR/kUPomqVZIzqhdCFPA8BwXSCz7hAel2Q157vtBvh9sngMMLXb5Fgzef5N4EuKO8pL5KrS+I9tfZac41vFJSdpgAirZYhh+tdcQQ1z0Qv/Rw0zOXjfvddCz3gEv2gB9KsLMVnTS1J4YOOgfza2adg9Ebz1z99DiF4vtCwn0IUwH/3ToTBwJLbMnC3Ol43yBNk8rgK2mkgCi614vOSD3hnVmio+iW6+AUklM8VPl6l7hEK9cljJY+9UsMVmTrvaFbMPwS6AdZCXKTmNdaMJcy3zSOXu5zvzihoQLwAu9LM3l2eVk0Mw0K7JXOP20fc8BtzWCOLYVP32r4R0BNuhTtvGqjHNZHPJN5OwaxkLpn2dujL9uDWGjRiOItKMVq/nOqmNGghrbf8IOaKT7VQhqOU4cXRkB/uF1UjYETBavwUZAxx9Wd/cMcAGmKiDxighxxQ29jDufl+2WG065tmJz+zCxmgrPh6Zb3KFUxPTe6yksAhWJhmGShA9v20t84M5c6NpZXoUsFcVja6XxzHeSB8dWq9Uu5QcZ83Gz/ronwdEjT2OGTtBgOFeTDqLYUgphC1gcUEHOCnTNXRMQOXqGwBfZHp+Mq61QcMq2rNS7xECAwEAAQ==";
      let publicKey = CliqzSecureMessage.secureLogger.publicKeyB64;
      crypto.subtle.importKey(
       'spki',
        fromBase64(publicKey),
        {
          name: 'RSA-OAEP',
          hash: { name: 'SHA-1' }
        },
        false,
        ['encrypt']
      ).then( key=> {
      crypto.subtle.encrypt(
          {
              name: "RSA-OAEP",
          },
          key,
          toUTF8(msg)
        )
        .then(function(encrypted){
          resolve(toBase64(new Uint8Array(encrypted)));
        })
        .catch(function(err){
            console.error("Error during rsa encryption: " + err);
            reject(err);
        });
      });
    })
    return promise;
  }
	/**
	 * Method to parse a message and encrypt with AES.
	 * @throws {string} Will throw 'msgtoobig' if message size exceeds a threshold.
	 * @returns string of AES encrypted message.
	 */
	aesEncrypt(type){
		var _this = this;
		var promise = new Promise(function(resolve, reject){
      var _iv = crypto.getRandomValues(new Uint8Array(16));
      var eventID = ('' + toHex(_iv)).substring(0,5);
      var aesKeyBytes;
      // console.log(">> IV: " + toHex(_iv));
      // console.log(">> E" + eventID);
      _this.eventID = eventID;
      _this.iv = toHex(_iv);
      _this.mID = eventID;
      _this.oiv = _iv;

      _this.aesGenerateKey().then( key => {
        return _this.aesExportKey(key)
      }).then( key => {
          let encryptionPaylod = {};
          encryptionPaylod['msg'] = _this.orgMessage;
          encryptionPaylod['endpoint'] = _this.endPoint;
          let msgEncrypt = JSON.stringify(encryptionPaylod);
          if(type === "telemetry"){
            try{
              msgEncrypt = padMessage(JSON.stringify(encryptionPaylod));
            }
            catch(e){
              reject(e);
              return;
            }
          }

          _this.aesEncryption(key, _iv, msgEncrypt).then( encryptedResult => {
            _this.mE = toBase64(new Uint8Array(encryptedResult));
            resolve(_this.mE);
          });
        });
      });
      return promise;
	}

	/**
	 * Method to parse a message and decrypt with AES.
	 * @returns string of AES decrypted message.
	 */
	aesDecrypt(msg){
		var _this = this;
		var promise = new Promise(function(resolve, reject){
      var _msg =fromBase64(msg.split(";")[1]);
      var hashKey = _this.aesKey;
      var _iv = _this.iv;
      crypto.subtle.importKey(
          "raw", //can be "jwk" or "raw"
          fromHex(hashKey),
          "AES-CBC",
          false, //whether the key is extractable (i.e. can be used in exportKey)
          ["decrypt"] //can be "encrypt", "decrypt", "wrapKey", or "unwrapKey"
      )
      .then(function(key){
          //returns the symmetric key
          // console.log("key");
          // console.log(key);
        crypto.subtle.decrypt(
        {
            name: "AES-CBC",
            iv: fromHex(_iv), //The initialization vector you used to encrypt
        },
        key, //from generateKey or importKey above
        _msg  //ArrayBuffer of the data
        )
        .then(function(decrypted){
            //returns an ArrayBuffer containing the decrypted data
            // console.log("Decrypted>>> " + fromUTF8(new Uint8Array(decrypted)));
            resolve(fromUTF8(new Uint8Array(decrypted)));
        })
        .catch(function(err){
            console.error(err);
        });
      })
      .catch(function(err){
          console.error(err);
      });

		})

		return promise;
	}

	/**
	 * Method to sign the AES encryptiong key with Aggregator Public key.
	 * Calculate mK = {AESKey;iv;endPoint}
	 * @returns string of encrypted key.
	 */
	signKey(){
		var _this = this;
		var promise = new Promise(function(resolve, reject){
			try{
				// To protect from padding oracle attacks, we need to send the hash of
				// mE.
				var mI = md5(_this.mE); // replace it with web-crypto md5.
				var messageToSign = _this.aesKey + ";" + _this.iv + ";endPoint;" + mI;
        _this.rsaEncrypt(messageToSign).then( encryptedResponse => {
          _this.signedKey = encryptedResponse;
          _this.mK = encryptedResponse;
          resolve(encryptedResponse);
        })

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

	rsaE(){
		rsaEncrypt();
	}

  checkLocalUniq(){
    let _this = this;
    let promise = new Promise(function(resolve, reject){
      // Check for local temporal uniquness
      var uniqKey = _this.dmC;
      if(localTemporalUniq && Object.keys(localTemporalUniq).indexOf(uniqKey) > -1) {
        if(localTemporalUniq[uniqKey]["fullhash"]){
          if(_this.fullHash === localTemporalUniq[uniqKey]["fullhash"]){
            reject("exact-duplicate");
          } else{
            reject("collision");
          }
        }
      }
      else{
        resolve(true);
      }
    });
    return promise;
  }

  blindMessage(){
    let _this = this;
    let promise = new Promise(function(resolve, reject){
      // After the message is SIGNED, we need to start the blind signature.
      _this.getMP();

      var uPK = CliqzSecureMessage.uPK.publicKeyB64;

      // Messages to be blinded.
      _this.m1 = _this.mP ;
      _this.m2 = _this.mP + ";" + uPK;
      _this.m3 = _this.mP + ";" + _this.dmC; // + ";" + uPK;

      var _bm1 = new blindSignContext(_this.m1);
      var _bm2 = new blindSignContext(_this.m2);
      var _bm3 = new blindSignContext(_this.m3);

      _this.r1 = _bm1.getBlindingNonce();
      _this.r2 = _bm2.getBlindingNonce();
      _this.r3 = _bm3.getBlindingNonce();


      // Get Unblinder - to unblind the message
      _this.u1 = _bm1.getUnBlinder();
      _this.u2 = _bm2.getUnBlinder();
      _this.u3 = _bm3.getUnBlinder();

      // Blind the message
       _bm1.blindMessage()
        .then( bm1 => {
          _this.bm1 = bm1;
          return _bm2.blindMessage()
        })
        .then( bm2 => {
          _this.bm2 = bm2;
          return _bm3.blindMessage();
        })
        .then( bm3 => {
          _this.bm3 = bm3;
          resolve(this);
        })
    })
    return promise;
  }

  userSign(){
    let _this = this;
    let promise = new Promise(function(resolve, reject){
      let uPK = CliqzSecureMessage.uPK.publicKeyB64;
      let payloadMsg = uPK + ";" + _this.bm1 + ";" + _this.bm2 + ";" + _this.bm3;
      let _uPK = new userPK(payloadMsg);
      return _uPK.sign(payloadMsg).then( signedData => {
        _this.signedData = signedData;
        resolve(this);
      });
    });
    return promise;
  }

  sendBlindPayload(){
    let _this = this;
    let promise = new Promise(function(resolve, reject){
      var payload = createPayloadBlindSignature(CliqzSecureMessage.uPK.publicKeyB64,
                                                _this.bm1,
                                                _this.bm2,
                                                _this.bm3,
                                                _this.signedData);
      return _http(CliqzSecureMessage.BLIND_SIGNER)
              .post(JSON.stringify(payload))
              .then(response => {
                _this.bsResponse = JSON.parse(response);
                resolve(this);
              });
    });
    return promise;
  }

  unBlindMessage(){
    let _this = this;
    let promise = new Promise(function(resolve, reject){
      let res = _this.bsResponse;
      // Capture the response
      var bs1 = res["bs1"];
      var bs2 = res["bs2"];
      var bs3 = res["bs3"];
      var suPK = res["suPK"];

      // Unblind the message to get the signature.
      _this.us1 = unBlindMessage(bs1, _this.u1);
      _this.us2 = unBlindMessage(bs2, _this.u2);
      _this.us3 = unBlindMessage(bs3, _this.u3);
      _this.suPK = suPK;
      resolve(this);
    });
    return promise;
  }

 signUnblindedMessage(){
    let _this = this;
    let promise = new Promise(function(resolve, reject){
      let payload = CliqzSecureMessage.uPK.publicKeyB64 + ";" + _this.mP +";"+  _this.dmC + ";" + _this.us1 + ";" + _this.us2 + ";" + _this.us3;
      let _uPK = new userPK(payload);
        return _uPK.sign(payload).then(signedMessageProxy => {
          _this.signedMessageProxy = signedMessageProxy;
          resolve(this);
        });
    });
    return promise;
  }

  sendMessageProxy(){
    let _this = this;
    let promise = new Promise(function(resolve, reject){
      let payload = createPayloadProxy(CliqzSecureMessage.uPK.publicKeyB64,
                                      _this.suPK ,
                                      _this.mP,
                                      _this.dmC,
                                      _this.us1,
                                      _this.us2,
                                      _this.us3,
                                      _this.signedMessageProxy);
      return _http(_this.proxyCoordinator)
              .post(JSON.stringify(payload))
              .then(() => resolve(this))
              .catch(err => {
                reject(err);
              });
    });
    return promise;
  }

  saveLocalCheckTable(){
    let _this = this;
    let promise = new Promise(function(resolve, reject){
      // Save the hash in temporal unique queue.
      var tt = new Date().getTime();
      localTemporalUniq[_this.dmC] = {"ts":tt, "fullhash": _this.fullHash};
      resolve(this);
    });
    return promise;

  }
  query(){
    let _this = this;
    let promise = new Promise(function(resolve, reject){
      _this.aesEncrypt().then( e => {
        return _this.signKey();
      }).then( e => {
        let data = {"mP":_this.getMP()};
        return _http(CliqzSecureMessage.queryProxyIP)
            .post(JSON.stringify(data), "instant");
        }).then ( res => {
            // Got response, let's decrypt it.
            _this.aesDecrypt(JSON.parse(res)["data"]).then( decryptedRes => {
              resolve(decryptedRes);
            });
        }).catch( err => _this.log(err));
    });
    return promise;
  }

  encryptedTelemetry(){
    let _this = this;
    let promise = new Promise(function(resolve, reject){
      try{
        return _this.getproxyCoordinator()
          .then(() => _this.checkLocalUniq())
          .then(() => _this.aesEncrypt("telemetry"))
          .then(() => _this.signKey())
          .then(() => _this.blindMessage())
          .then(() => _this.userSign())
          .then(() => _this.sendBlindPayload())
          .then(() => _this.unBlindMessage())
          .then(() => _this.signUnblindedMessage())
          .then(() => _this.sendMessageProxy())
          .then(() => _this.saveLocalCheckTable())
          .then(() => resolve(true))
          .catch( err => {
            console.log(err);
            reject(err);
          });
      }
      catch (err){
        console.log("Error creating mc: " + err);
        reject(err);
      }
    });
    return promise;
  }
};
