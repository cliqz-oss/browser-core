import CliqzSecureMessage from './index';
import {
  privateKeytoKeypair,
  exportPrivateKey,
  exportPublicKey
} from '../../core/crypto/pkcs-conversion';

import {
  toUTF8,
  toHex,
  fromHex,
  fromBase64
} from '../../core/encoding';

import _http from './http-worker';

import crypto from '../../platform/crypto';

export default class {
  constructor(msg) {
    this.privateKey = "";
    this.publicKey = "";
  }

  /**
   * Method to sign the str using userSK.
   * @returns signature in hex format.
   */
  sign(msg){
    var promise = new Promise(function(resolve, reject){
      var ppk = privateKeytoKeypair(CliqzSecureMessage.uPK.privateKey);
      crypto.subtle.importKey(
        "pkcs8",
        fromBase64(ppk[1]),
        {name: "RSASSA-PKCS1-v1_5", hash: "SHA-256"},
        false,
        ["sign"]
      )
      .then(function(privateKey) {
        var documentBytes = toUTF8(msg);
        crypto.subtle.sign(
          {name: "RSASSA-PKCS1-v1_5", hash: "SHA-256"},
          privateKey,
          documentBytes
        )
        .then(function(signatureBuffer) {
          var signatureBytes = new Uint8Array(signatureBuffer);
          var signatureHex = toHex(signatureBytes);
          resolve(signatureHex);
        }).catch( err => reject(err));
      }).catch(err => reject(err));
    });
    return promise;
  }

  verify(sig, msg){
    var promise = new Promise(function(resolve, reject){
      var ppk = privateKeytoKeypair(CliqzSecureMessage.uPK.privateKey);
      crypto.subtle.importKey(
        "spki",
        fromBase64(ppk[0]),
        {name: "RSASSA-PKCS1-v1_5", hash: "SHA-256"},
        false,
        ["verify"]
      )
      .then(function(publicKey) {
        var signatureBytes = fromHex(sig);
        var documentBytes = toUTF8(msg);
        crypto.subtle.verify(
          {name: "RSASSA-PKCS1-v1_5", hash: "SHA-256"},
          publicKey,
          signatureBytes,
          documentBytes
        )
        .then(function(validSignature) {
          resolve(validSignature);
        }).catch( err => console.log(err));
      });
    });
    return promise;
  }

  generateKey() {
    var _this = this;
    var promise = new Promise(function(resolve, reject){
      crypto.subtle.generateKey(
         {
            name: "RSASSA-PKCS1-v1_5",
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: {name: "SHA-256"},
         },
          true,
         ["sign", "verify"]
      ).then( key => {
        return crypto.subtle.exportKey("jwk", key.privateKey)
      }).then( key => {
         var return_data = {}
         return_data["privKeyB64"] = exportPrivateKey(key);
         return_data["publicKeyB64"] = exportPublicKey(key);
         _this.privateKey = return_data["privKeyB64"];
         _this.publicKey = return_data["publicKeyB64"];
         return return_data;
      }).then( keys => {
         return _http(CliqzSecureMessage.USER_REG).post(JSON.stringify({"pk":keys["publicKeyB64"]}));
      }).then( e => resolve({"status":true,"privateKey":_this.privateKey,"publicKey":_this.publicKey}))
      .catch( e => reject({"status": e.message}));
    });
    return promise;
  }
};
