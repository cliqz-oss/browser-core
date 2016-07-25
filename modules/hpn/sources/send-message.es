import CliqzSecureMessage from 'hpn/main';
import messageContext from "hpn/message-context";
import directoryServicePK from "hpn/directory-service";
import { saveLocalCheckTable } from "hpn/main";
import CliqzHumanWeb from "human-web/human-web";

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

// Using this function it is easier to see if the push of message failed.
var sendMessage = function(m) {
    return new Promise((resolve, reject) => {
        try{
            var mc = new messageContext(m);
        }
        catch (e){
            CliqzUtils.log("Error creating mc: " + e,CliqzSecureMessage.LOG_KEY);
            reject('error-creating-mc');
            return;
        }
        CliqzHumanWeb.incrActionStats("tRcvd");

        // Check for local temporal uniquness
        var uniqKey = mc.dmC;
        if(CliqzSecureMessage.localTemporalUniq && Object.keys(CliqzSecureMessage.localTemporalUniq).indexOf(uniqKey) > -1) {
            CliqzUtils.log("This message has already been sent....",CliqzSecureMessage.LOG_KEY);
            if(CliqzSecureMessage.localTemporalUniq[uniqKey]["fullhash"]){
                if(mc.fullHash == CliqzSecureMessage.localTemporalUniq[uniqKey]["fullhash"]){
                    CliqzHumanWeb.incrActionStats("exactduplicate");
                } else{
                    CliqzHumanWeb.incrActionStats("coll");
                }
            }
            CliqzHumanWeb.incrActionStats("droppedLocalCheck");
            reject('dropped-local-check');
            return;
        }

        mc.aesEncrypt()
        .then(data => {
            // After the message is AES encrypted, we need to sign the AES key.
            return mc.signKey()
        })
        .then(data => {
            // After the message is SIGNED, we need to start the blind signature.
            mc.getMP();
            var uPK = CliqzSecureMessage.uPK.publicKeyB64;
            // Messages to be blinded.
            mc.m1 = mc.mP ;
            mc.m2 = mc.mP + ";" + uPK;
            mc.m3 = mc.mP + ";" + mc.dmC; // + ";" + uPK;

            var _bm1 = new blindSignContext(mc.m1);
            var _bm2 = new blindSignContext(mc.m2);
            var _bm3 = new blindSignContext(mc.m3);

            mc.r1 = _bm1.getBlindingNonce();
            mc.r2 = _bm2.getBlindingNonce();
            mc.r3 = _bm3.getBlindingNonce();

            // Get Unblinder - to unblind the message
            mc.u1 = _bm1.getUnBlinder();
            mc.u2 = _bm2.getUnBlinder();
            mc.u3 = _bm3.getUnBlinder();

            // Blind the message
            mc.bm1 = _bm1.blindMessage();
            mc.bm2 = _bm2.blindMessage();
            mc.bm3 = _bm3.blindMessage();

            // SIG(uPK;bm1;bm2;bm3)
            return CliqzSecureMessage.uPK.sign(uPK + ";" + mc.bm1 + ";" + mc.bm2 + ";" + mc.bm3)
        })
        .then(data => {
            mc.sigendData = data;
            var payload = createPayloadBlindSignature(CliqzSecureMessage.uPK.publicKeyB64, mc.bm1, mc.bm2, mc.bm3, mc.sigendData);
            return CliqzSecureMessage.httpHandler(CliqzSecureMessage.dsPK.endPoint)
            .post(JSON.stringify(payload))

        })
        .then(response => {
            var response = JSON.parse(response);
            // Capture the response
            var bs1 = response["bs1"];
            var bs2 = response["bs2"];
            var bs3 = response["bs3"];
            var suPK = response["suPK"];

            // Unblind the message to get the signature.
            mc.us1 = unBlindMessage(bs1, mc.u1);
            mc.us2 = unBlindMessage(bs2, mc.u2);
            mc.us3 = unBlindMessage(bs3, mc.u3);
            // Verify the signature matches after unblinding.
            mc.vs1 = verifyBlindSignature(mc.us1, sha256_digest(mc.m1))
            mc.vs2 = verifyBlindSignature(mc.us2, sha256_digest(mc.m2))
            mc.vs3 = verifyBlindSignature(mc.us3, sha256_digest(mc.m3))

            mc.suPK = suPK;

            // SIG(uPK;mp;dmC;us1;us2;us3)
            return CliqzSecureMessage.uPK.sign(CliqzSecureMessage.uPK.publicKeyB64 + ";" + mc.mP +";"+  mc.dmC + ";" + mc.us1 + ";" + mc.us2 + ";" + mc.us3);
        })
        .then(signedMessageProxy => {
            // Create the payload to be sent to proxy;
            var payload = createPayloadProxy(CliqzSecureMessage.uPK.publicKeyB64, mc.suPK ,mc.mP, mc.dmC, mc.us1, mc.us2, mc.us3, signedMessageProxy);
            CliqzSecureMessage.stats(mc.proxyCoordinator, "telemetry-sent",1);
            return CliqzSecureMessage.httpHandler(mc.proxyCoordinator)
            .post(JSON.stringify(payload))

        })
        .then(response => {
            var tt = new Date().getTime();
            CliqzSecureMessage.localTemporalUniq[mc.dmC] = {"ts":tt, "fullhash": mc.fullHash};
            CliqzSecureMessage.stats(mc.proxyCoordinator, "telemetry-success",1);
            CliqzHumanWeb.incrActionStats("tSent");
            resolve();
        })
        .catch(err =>  {
            if (err === 'msgtoobig') {
                CliqzUtils.log(`Error promise failed: msgtoobig-${m.action}`, CliqzSecureMessage.LOG_KEY);
                CliqzHumanWeb.incrActionStats(`msgtoobig-${m.action}`);
            } else {
                CliqzUtils.log(`Unknown error: ${err}-${m.action}`, CliqzSecureMessage.LOG_KEY);
                CliqzHumanWeb.incrActionStats(`unknownerror-${m.action}`);
            }
            CliqzSecureMessage.stats(mc.proxyCoordinator, "telemetry-error",1);
            reject('error-promise-failed');
        })
    });
}

/*
This will send the messages inside the trk one at a time. This uses a generator expression.

Will return a Promise which resolves to an array, one for each sent message:
its value will be null if everything was ok, and a string indicating the error message otherwise (useful for testing)
*/
var sendM = function (m, sent=[]) {
    return sendMessage(m)
    .then(() => { // Message sending OK
        sent.push(null);
        let nextMsg = CliqzSecureMessage.nextMessage();
        if(nextMsg) {
            return sendM(nextMsg, sent);
        }
        else{
            // Queue is empty hence dump the local temp queue to disk.
            saveLocalCheckTable();
            return sent;
        }

    })
    .catch(e => { // Message sending KO
        sent.push(e);
        let nextMsg = CliqzSecureMessage.nextMessage();
        if(nextMsg) {
            return sendM(nextMsg, sent);
        }
        else {
            // Queue is empty hence dump the local temp queue to disk.
            saveLocalCheckTable();
            return sent;
        }
    });
}

export { sendM };

