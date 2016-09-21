import CliqzSecureMessage from 'hpn/main';
import { _http } from 'hpn/utils';
import { byteArrayToHexString, base64ToByteArray, stringToByteArray, privateKeytoKeypair } from "hpn/crypto-utils";


/**
Generate user Public-private key.
This should be long-time key
Only generate if the key is not already generated and stored on the machine.
For now in prefs.
*/
export default class {
  constructor(msg) {
    var keySet = CliqzUtils.getPref('userPKTest',false,'extensions.cliqz_hpn.');
    if(!keySet) {
       // Using 2048 as 4096 is compute intensive.
       this.genKey().then(e=> CliqzUtils.log("Key generated"));
    }
    else{
      this.keyGen = new JSEncrypt({default_key_size:2048});
      this.keyGen.setPrivateKey(keySet);
      this.privateKey = this.keyGen.getPrivateKeyB64();
      this.publicKey = this.keyGen.getPublicKey();
      this.publicKeyB64 = this.keyGen.getPublicKeyB64();
    }
  }

  /**
   * Method to encrypt messages using long lived public key.
  */
  encrypt(msg){
    return this.keyGen.encrypt(msg);
  }

  /**
  * Method to decrypt messages using long lived public key.
  */
  decrypt(msg){
    return this.keyGen.decrypt(msg);
  }

  /**
   * Method to sign the str using userSK.
   * @returns signature in hex format.
   */
  sign(msg){
    var promise = new Promise(function(resolve, reject){
      var ppk = privateKeytoKeypair(CliqzSecureMessage.uPK.privateKey);
      CliqzSecureMessage.crypto.subtle.importKey(
        "pkcs8",
        base64ToByteArray(ppk[1]),
        {name: "RSASSA-PKCS1-v1_5", hash: "SHA-256"},
        false,
        ["sign"]
      )
      .then(function(privateKey) {
        var documentBytes = stringToByteArray(msg);
        CliqzSecureMessage.crypto.subtle.sign(
          {name: "RSASSA-PKCS1-v1_5", hash: "SHA-256"},
          privateKey,
          documentBytes
        )
        .then(function(signatureBuffer) {
          var signatureBytes = new Uint8Array(signatureBuffer);
          var signatureHex = byteArrayToHexString(signatureBytes);
          resolve(signatureHex);
        })
      })
    })
    return promise;
  }
  /*
  sign(msg){
    var _this = this;
    var promise = new Promise(function(resolve, reject){
      try{
        var rsa = new CliqzSecureMessage.RSAKey();
        rsa.readPrivateKeyFromPEMString(CliqzSecureMessage.uPK.privateKey);
        var hSig = rsa.sign(msg,"sha256");
        resolve(hSig);

      }
      catch(e){
        reject(e);
      }
    })
    return promise;
  }
  */
  genKey(){
    var _this = this;
    var promise = new Promise(function(resolve, reject){
     _this.keyGen = new JSEncrypt({default_key_size:2048});
     _this.privateKey = _this.keyGen.getPrivateKeyB64 ();
     _this.publicKey = _this.keyGen.getPublicKeyB64();
     _this.publicKeyB64 = _this.keyGen.getPublicKeyB64();
     CliqzUtils.setPref('userPKTest', _this.privateKey, 'extensions.cliqz_hpn.');
     _this.registerKey()
     .then( e=> {
        CliqzUtils.log("Registration complete");
        resolve();
      });
    });
    return promise;
  }

  registerKey(){
    // Needs to be public.
    var upk = this.publicKeyB64;

    var promise = new Promise(function(resolve, reject){
      CliqzUtils.log("Setting public Key","user-pk");
      _http("http://hpn-sign.cliqz.com/register")
        .post(JSON.stringify({"pk": upk}))
        .then(e=> resolve(true))
    });

    return promise;
  }
}
