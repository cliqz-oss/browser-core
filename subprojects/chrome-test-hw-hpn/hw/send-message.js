// Using this function it is easier to see if the push of message failed.
const sendMessage = function (ww, m) {
  try {
    ww.postMessage({
      msg: m,
      type: 'telemetry',
      sourcemap: CliqzSecureMessage.sourceMap,
      upk: CliqzSecureMessage.uPK,
      dspk: CliqzSecureMessage.dsPK,
      sspk: CliqzSecureMessage.secureLogger,
      routetable: CliqzSecureMessage.routeTable,
      localTemporalUniq: CliqzSecureMessage.localTemporalUniq,
    });
  } catch (e) {
    // CliqzUtils.log('Error creating mc: ' + e, CliqzSecureMessage.LOG_KEY);
    return;
  }
};

/*
This will send the messages inside the trk one at a time. This uses a generator expression.
Will return a Promise which resolves to an array, one for each sent message:
its value will be null if everything was ok,
and a string indicating the error message otherwise (useful for testing)
*/
const sendM = function (m, sent = []) {
  const sendMessageWCrypto = new Worker(hpnWorkerPath);
  sendMessage(sendMessageWCrypto, m);

  sendMessageWCrypto.onmessage = function (e) {
    if (e.data.type === 'telemetry') {
      CliqzSecureMessage.localTemporalUniq = e.data.localTemporalUniq;
      CliqzSecureMessage.saveLocalCheckTable();
    }

    const nextMsg = CliqzSecureMessage.nextMessage();
    if (nextMsg) {
      sendMessage(sendMessageWCrypto, nextMsg);
    } else {
      // Queue is empty hence dump the local temp queue to disk.
      CliqzSecureMessage.saveLocalCheckTable();
      sendMessageWCrypto.terminate();
      return sent;
    }
  };
};