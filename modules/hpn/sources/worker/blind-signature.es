import { randBigInt } from 'bigint';
import CliqzSecureMessage from './index';
import {
  base64_decode,
  base64UrlDecode,
  byteArrayToHexString,
  stringToByteArray,
  h2d
} from './crypto-utils';

export function parseDSKey(){
    // Parse key contents.
    var _this = this;
    return new Promise(function(resolve, reject){
        crypto.subtle.importKey(
         'spki',
          base64_decode(CliqzSecureMessage.dsPK.pubKeyB64),
          {
            name: 'RSA-OAEP',
            hash: { name: 'SHA-1' }
          },
          true,
          ['encrypt']
        ).then( key=> {
          crypto.subtle.exportKey("jwk", key).then(
              function(key) {
                // base64url-decode modulus
                var modulus = base64UrlDecode(key.n);
                CliqzSecureMessage.dsPK["n"] = h2d(byteArrayToHexString(modulus));
                // base64url-decode exponent
                var exponent = base64UrlDecode(key.e);
                CliqzSecureMessage.dsPK["e"] = '' + h2d(byteArrayToHexString(exponent));
                resolve();
                // modulus and exponent are now Uint8Arrays
          })
          .catch(err => console.log(err));
        });
    });
}

export function unBlindMessage(blindSignedMessage, unBlinder){
  // Unblind the message before sending it for verification.
  // s = u*(bs) mod n
  var _us = multMod(unBlinder, str2bigInt(blindSignedMessage, 16), str2bigInt(CliqzSecureMessage.dsPK.n, 10));
  var us = bigInt2str(_us,10, 0);
  return us;
}

function verifyBlindSignature(signedMessage, hashedOriginalMessage){
    // Verify the message to see, the signer is not the problem.
    // m = s^e mod n

    var message_signed = bigInt2str(powMod(str2bigInt(signedMessage,10,0), str2bigInt(CliqzSecureMessage.dsPK.e, 10), str2bigInt(CliqzSecureMessage.dsPK.n, 10)),10);
    var original_message = bigInt2str(str2bigInt(hashedOriginalMessage,16),10);

    if(original_message === message_signed.toLowerCase()){
        return true;
    }
    else{
        return false;
    }
}
// Set the context for blind signatures right.
export let blindSignContext = function (msg) {
    /*
    Initialize it with the following:
    1. Signer Public Key
    2. Signer Public Exponent
    3. Signer Public Modulous
    */

    // this.keyObj = new JSEncrypt();
    this.randomNumber = null;
    this.blindingNonce = null;
    this.blinder = null;
    this.unblinder = null;
    this.keySize = 4096;
    this.hashedMessage = "";
    this.bm = "";
    this.signedMessage = "";
    this.msg = msg;
}

blindSignContext.prototype.exponent = function(){
    // Return the public exponent
    return this.e;
}

blindSignContext.prototype.modulus = function(){
    // Return the public modulous
    return this.n;
}

blindSignContext.prototype.log =  function(msg){
  console.log(msg, "Blind Signature");

}

blindSignContext.prototype.hashMessage = function(){
    // Need sha256 digest the message.
    let _this = this;
    let promise = new Promise(function(resolve, reject){
      crypto.subtle.digest("SHA-256", stringToByteArray(_this.msg)).then( hash => {
        resolve(byteArrayToHexString(new Uint8Array(hash)));
      });
    });
    return promise;
    /*
    var msg = this.msg;
    this.hashedMessage = sha256_digest(msg);
    return this.hashedMessage;
    */
}

blindSignContext.prototype.getBlindingNonce = function(){
    // Create a random value.

    var randomNumber = randBigInt(this.keySize,1);
    this.blindingNonce = randomNumber;
    return randomNumber;
}

blindSignContext.prototype.getBlinder = function(){
    // Calculate blinder.
    // b = r ^ e mod n
    var b = powMod(this.blindingNonce, str2bigInt(CliqzSecureMessage.dsPK.e, 10), str2bigInt(CliqzSecureMessage.dsPK.n, 10));
    this.blinder = b;
    return b;
}

blindSignContext.prototype.getUnBlinder = function(){
    // Calculate blinder.
    // b = r ^ e mod n
    var u = inverseMod(this.blindingNonce, str2bigInt(CliqzSecureMessage.dsPK.n, 10));
    this.unblinder = u;
    return u;
}

blindSignContext.prototype.blindMessage = function(){
    // Blind the message before sending it for signing.
    // bm = b*m mod n
    let _this = this;
    let promise = new Promise(function(resolve, reject){
      _this.hashMessage().then( hashMessage => {
        // var rnd = this.getBlindingNonce();
        var blinder = _this.getBlinder();
        var bm = multMod(blinder, str2bigInt(hashMessage, 16), str2bigInt(CliqzSecureMessage.dsPK.n, 10));
        _this.bm = bigInt2str(bm, 10);
        resolve(_this.bm);
      });
    })
    return promise;
}


blindSignContext.prototype.unBlindMessage = function(blindSignedMessage){
    // Unblind the message before sending it for verification.
    // s = u*(bs) mod n

    var bs = blindSignedMessage;
    var us = multMod(this.unblinder, str2bigInt(bs, 16), str2bigInt(CliqzSecureMessage.dsPK.n, 10));
    var us = bigInt2str(_us,10, 0)
    this.signedMessage = us;
    return us;
}

blindSignContext.prototype.verify = function(){
    // Verify the message to see, the signer is not the problem.
    // m = s^e mod n
    var _this = this;
    return new Promise(function(resolve, reject){
        var message_signed = bigInt2str(powMod(str2bigInt(_this.signedMessage,10,0), str2bigInt(_this.e, 10), str2bigInt(_this.n, 10)),10);
        var original_message = bigInt2str(str2bigInt(_this.hashedMessage,16),10);
        // var original_message = _this.hashedMessage;
        _this.log("Org message:" + original_message);
        _this.log("Sign message:" + message_signed);
        if(original_message === message_signed.toLowerCase()){
            resolve(true);
        }
        else{
            // Need to replace this with reject.
            resolve(false);
        }

    })

}
