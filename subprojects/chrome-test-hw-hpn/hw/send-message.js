// Using this function it is easier to see if the push of message failed.
var sendMessage = function(m) {
    return new Promise((resolve, reject) => {
        try{
            var mc = new messageContext(m);
            mc.getproxyCoordinator()
            .then(peerName =>{
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

                mc.aesEncrypt("telemetry")
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
                    // mc.vs1 = verifyBlindSignature(mc.us1, sha256_digest(mc.m1))
                    // mc.vs2 = verifyBlindSignature(mc.us2, sha256_digest(mc.m2))
                    // mc.vs3 = verifyBlindSignature(mc.us3, sha256_digest(mc.m3))

                    mc.suPK = suPK;

                    // SIG(uPK;mp;dmC;us1;us2;us3)
                    return CliqzSecureMessage.uPK.sign(CliqzSecureMessage.uPK.publicKeyB64 + ";" + mc.mP +";"+  mc.dmC + ";" + mc.us1 + ";" + mc.us2 + ";" + mc.us3);
                })
                .then(signedMessageProxy => {
                    // Create the payload to be sent to proxy;
                    var payload = createPayloadProxy(CliqzSecureMessage.uPK.publicKeyB64, mc.suPK ,mc.mP, mc.dmC, mc.us1, mc.us2, mc.us3, signedMessageProxy);
                    CliqzSecureMessage.stats(mc.proxyCoordinator, "telemetry-sent",1);
                    // CliqzSecureMessage.sampleMessage.push(payload);
                    // return CliqzSecureMessage.peer.sendStringMsg(mc.proxyCoordinator, JSON.stringify(payload),"telemetry")
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
            })
        }
        catch (e){
            CliqzUtils.log("Error creating mc: " + e,CliqzSecureMessage.LOG_KEY);
            reject('error-creating-mc');
            return;
        }

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
            CliqzSecureMessage.saveLocalCheckTable();
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
            CliqzSecureMessage.saveLocalCheckTable();
            return sent;
        }
    });
}