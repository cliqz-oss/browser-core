/**
 * Method to create payload to send for blind signature.
 * The payload needs to consist of <uPK,
                                    {mP}*r1, // BM1
                                    {mP, uPK}*r2, // BM2
                                    {DmC, uPK} * r3, // BM3
                                    SIG(uPK;bm1;bm2;bm3)
                                    >
 * @returns string with payload created.
*/

function createPayloadBlindSignature(uPK, bm1, bm2, bm3, sig){
    var payload = {};
    payload["uPK"] = uPK;
    payload["bm1"] = bm1;
    payload["bm2"] = bm2;
    payload["bm3"] = bm3;
    payload["sig"] = sig;
    return payload;
 }

/**
 * Method to create payload to send to proxy.
 * The payload needs to consist of <uPK,
                                    dmC,
                                    {H{mP}*r1}Dsk, // BlindSigned1
                                    {H(mP, uPK)}Dsk, // BlindSigned2
                                    {H(mP, dmC)}Dsk, // BlindSigned3
                                    SIG(uPK;dmC;bs1;bs2;bs3)
                                    >
 * @returns string with payload created.
 */

function createPayloadProxy(uPK, suPK, mP, dmC, bs1, bs2, bs3, sig){
    var payload = {};
    payload["uPK"] = uPK;
    payload["suPK"] = suPK;
    payload["mP"] = mP;
    payload["dmC"] = dmC;
    payload["bs1"] = bs1;
    payload["bs2"] = bs2;
    payload["bs3"] = bs3;
    payload["sig"] = sig;
    return payload;
}

function unBlindMessage(blindSignedMessage, unBlinder){
  // Unblind the message before sending it for verification.
  // s = u*(bs) mod n
  var _us = multMod(unBlinder, str2bigInt(blindSignedMessage, 16), str2bigInt(CliqzSecureMessage.dsPK.n, 10));
  var us = bigInt2str(_us,10, 0)
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
var blindSignContext = function (msg) {
    /*
    Initialize it with the following:
    1. Signer Public Key
    2. Signer Public Exponent
    3. Signer Public Modulous
    */

    this.keyObj = new JSEncrypt();
    this.randomNumber = null;
    this.blindingNonce = null;
    this.blinder = null;
    this.unblinder = null;
    this.keySize = 4096;
    this.hashedMessage = "";
    this.bm = "";
    this.signedMessage = "";
    this.msg = msg;
    CliqzSecureMessage.dsPK = new directoryServicePK();
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
    if(CliqzSecureMessage.debug){
        CliqzUtils.log(msg, "Blind Signature")
    }

}

blindSignContext.prototype.hashMessage = function(){
    // Need sha256 digest the message.
    var msg = this.msg;
    this.hashedMessage = sha256_digest(msg);
    return this.hashedMessage;
}

blindSignContext.prototype.getBlindingNonce = function(){
    // Create a random value.

    var randomNumber = randBigInt(this.keySize,1);
    this.blindingNonce = randomNumber
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
    var hashMessage = this.hashMessage();
    // var rnd = this.getBlindingNonce();
    var blinder = this.getBlinder();
    var bm = multMod(blinder, str2bigInt(hashMessage, 16), str2bigInt(CliqzSecureMessage.dsPK.n, 10));
    this.bm = bigInt2str(bm, 10);
    return this.bm;
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
        // _this.log("Org message:" + original_message);
        // _this.log("Sign message:" + message_signed);
        if(original_message === message_signed.toLowerCase()){
            resolve(true);
        }
        else{
            // Need to replace this with reject.
            resolve(false);
        }

    })

}