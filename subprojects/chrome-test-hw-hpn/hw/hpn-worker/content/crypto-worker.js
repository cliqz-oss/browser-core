// START crypto-worker.js

// Global variables
if (!CliqzSecureMessage) {
  var CliqzSecureMessage = {};
}
let localTemporalUniq = {};
CliqzSecureMessage.BLIND_SIGNER = {{ENDPOINT_BLIND_SIGNER}};
CliqzSecureMessage.USER_REG = {{ENDPOINT_USER_REG}};

self.onmessage = function(e) {
  const msgType = e.data.type;

  if( msgType === 'instant' ) {
    const msg = e.data.msg;
    const uid =  e.data.uid;
    const response = {};
    CliqzSecureMessage.sourceMap = e.data.sourcemap;
    CliqzSecureMessage.uPK = e.data.upk;
    CliqzSecureMessage.queryProxyIP = e.data.queryproxyip;
    CliqzSecureMessage.dsPK = e.data.dspk;
    CliqzSecureMessage.secureLogger = e.data.sspk;

    const mc = new messageContext(msg);
    mc.query().then( result => {
      response.res = result;
      response.uid = uid;
      response.type = 'instant';
      postMessage(response);
    });
  }

  if (msgType === 'telemetry') {
    const msg = e.data.msg;
    const response = {};
    response.type = 'telemetry';
    let mc = null;
    CliqzSecureMessage.sourceMap = e.data.sourcemap;
    CliqzSecureMessage.uPK = e.data.upk;
    CliqzSecureMessage.dsPK = e.data.dspk;
    CliqzSecureMessage.secureLogger = e.data.sspk;
    CliqzSecureMessage.routeTable = e.data.routetable;
    localTemporalUniq = e.data.localTemporalUniq;

    try {
      mc = new messageContext(msg);
    } catch (err) {
        response.localTemporalUniq = localTemporalUniq;
        postMessage(response);
        return;
    }

    parseDSKey().then( e => {
      mc.encryptedTelemetry().then( result => {
        response.localTemporalUniq = localTemporalUniq;
        postMessage(response);
      }).catch( err => {
        response.localTemporalUniq = localTemporalUniq;
        postMessage(response);
      });
    })
  }

  if (msgType === 'user-key') {
    const upk = new userPK();
    upk.generateKey().then( e => {
      postMessage(e);
    }).catch( e => postMessage(e));
  }

  if (msgType === 'test') {
    const msg = e.data.msg;
    const response = {};
    response.type = 'test';
    CliqzSecureMessage.sourceMap = e.data.sourcemap;
    CliqzSecureMessage.uPK = e.data.upk;
    CliqzSecureMessage.dsPK = e.data.dspk;
    CliqzSecureMessage.routeTable = e.data.routetable;
    localTemporalUniq = e.data.localTemporalUniq;

    const mc = new messageContext(msg);
    mc.getproxyCoordinator()
      .then( e => {
        response.mc = mc;
        postMessage(response);
      });
  }

  if (msgType === 'test-sha1' || msgType === 'hw-sha1') {
    sha1(e.data.msg)
      .then( result => {
        const response = {};
        response.result = result;
        postMessage(response);
      });
  }

  if (msgType === 'test-rsa-sign') {
    const msg = e.data.msg;
    const response = {};
    CliqzSecureMessage.uPK = {'privateKey' : e.data.upk};
    const uPK = new userPK(msg);

    uPK.sign(msg)
      .then( result => {
        response.result = result;
        postMessage(response);
      })
      .catch( err => {
        response.result = false;
        postMessage(response);
      });
  }

  if ( msgType === 'test-rsa-verify' ){
    const signature = e.data.sig;
    const msg = e.data.msg;
    const response = {};

    CliqzSecureMessage.uPK = {'privateKey' : e.data.upk};
    const uPK = new userPK(msg);

    uPK.verify(signature, msg)
      .then( result => {
        response.result = result;
        postMessage(response);
      })
      .catch( err => {
        response.result = false;
        postMessage(response);
      });
  }
};
// END crypto-worker.js