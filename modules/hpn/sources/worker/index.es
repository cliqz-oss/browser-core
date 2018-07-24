// FIXME: remove this
/* eslint no-console: off */

import MessageContext from './message-context';
import { sha1 } from '../../core/crypto/utils';
import UserPK from './user-pk';
import { parseDSKey } from './blind-signature';
import config from '../../core/config';

if (typeof crypto === 'undefined') {
  throw new Error('hpn-worker: crypto not present in this platform');
}

// Global variables
const CliqzSecureMessage = {
  localTemporalUniq: {},
};

CliqzSecureMessage.BLIND_SIGNER = config.settings.ENDPOINT_BLIND_SIGNER;
CliqzSecureMessage.USER_REG = config.settings.ENDPOINT_USER_REG;

const logger = {
  log: console.log.bind(console),
  error: console.error.bind(console),
};


self.onmessage = (e) => {
  try {
    const msgType = e.data.type;

    if (msgType === 'instant') {
      const msg = e.data.msg;
      const uid = e.data.uid;
      const response = {};
      CliqzSecureMessage.sourceMap = e.data.sourcemap;
      CliqzSecureMessage.uPK = e.data.upk;
      const queryProxyUrl = e.data.queryProxyUrl;
      if (!queryProxyUrl) {
        throw new Error(`Could not send instant message (action=${msg.action}), as the queryProxyUrl is missing`);
      }

      CliqzSecureMessage.dsPK = e.data.dspk;
      CliqzSecureMessage.secureLogger = e.data.sspk;

      const mc = new MessageContext(msg, CliqzSecureMessage, logger);
      mc.query(queryProxyUrl).then((result) => {
        response.res = result;
        response.uid = uid;
        response.type = 'instant';
        postMessage(response);
      }).catch(postMessage);
      return;
    }

    if (msgType === 'telemetry') {
      const msg = e.data.msg;
      const response = {};
      response.type = 'telemetry';
      CliqzSecureMessage.sourceMap = e.data.sourcemap;
      CliqzSecureMessage.uPK = e.data.upk;
      CliqzSecureMessage.dsPK = e.data.dspk;
      CliqzSecureMessage.secureLogger = e.data.sspk;
      CliqzSecureMessage.routeTable = e.data.routetable;
      CliqzSecureMessage.localTemporalUniq = e.data.localTemporalUniq;

      let mc;
      try {
        mc = new MessageContext(msg, CliqzSecureMessage, logger);
      } catch (err) {
        response.localTemporalUniq = CliqzSecureMessage.localTemporalUniq;
        postMessage(response);
        return;
      }

      parseDSKey(CliqzSecureMessage.dsPK.pubKeyB64)
        .then((keys) => {
          CliqzSecureMessage.dsPK.e = keys.e;
          CliqzSecureMessage.dsPK.n = keys.n;
        })
        .then(() => mc.encryptedTelemetry())
        .then((/* result */) => {
          response.localTemporalUniq = CliqzSecureMessage.localTemporalUniq;
          postMessage(response);
        })
        .catch((/* err */) => {
          response.localTemporalUniq = CliqzSecureMessage.localTemporalUniq;
          postMessage(response);
        });
      return;
    }

    if (msgType === 'user-key') {
      const upk = new UserPK(CliqzSecureMessage, logger);
      upk.generateKey().then((_e) => {
        postMessage(_e);
      }).catch(postMessage);
      return;
    }

    if (msgType === 'test') {
      const msg = e.data.msg;
      const response = {};
      response.type = 'test';
      CliqzSecureMessage.sourceMap = e.data.sourcemap;
      CliqzSecureMessage.uPK = e.data.upk;
      CliqzSecureMessage.dsPK = e.data.dspk;
      CliqzSecureMessage.routeTable = e.data.routetable;
      CliqzSecureMessage.localTemporalUniq = e.data.localTemporalUniq;

      const mc = new MessageContext(msg, CliqzSecureMessage, logger);
      mc.getproxyCoordinator()
        .then((/* e */) => {
          response.mc = mc.toJSON();
          postMessage(response);
        }).catch((_e) => {
          console.error('hpn-worker test', _e);
          postMessage({
            type: 'test',
            error: true,
          });
        });
      return;
    }

    if (msgType === 'test-sha1' || msgType === 'hw-sha1') {
      sha1(e.data.msg)
        .then((result) => {
          const response = {};
          response.result = result;
          postMessage(response);
        }).catch(postMessage);
      return;
    }

    if (msgType === 'test-rsa-sign') {
      const msg = e.data.msg;
      const response = {};
      CliqzSecureMessage.uPK = { privateKey: e.data.upk };
      const uPK = new UserPK(CliqzSecureMessage, logger);

      uPK.sign(msg)
        .then((result) => {
          response.result = result;
          postMessage(response);
        })
        .catch((/* err */) => {
          response.result = false;
          postMessage(response);
        });
      return;
    }

    if (msgType === 'test-rsa-verify') {
      const signature = e.data.sig;
      const msg = e.data.msg;
      const response = {};

      CliqzSecureMessage.uPK = { privateKey: e.data.upk };
      const uPK = new UserPK(CliqzSecureMessage, logger);

      uPK.verify(signature, msg)
        .then((result) => {
          response.result = result;
          postMessage(response);
        })
        .catch((/* err */) => {
          response.result = false;
          postMessage(response);
        });
      return;
    }

    throw new Error(`Unknown message type ${msgType}`);
  } catch (err) {
    console.log(err);
    try {
      postMessage(`${err}: ${err.stack}`);
    } catch (err2) {
      // Protection against 'DataCloneError: The object could not be cloned' errors
      console.error('Failed to serialize message:', err);
      postMessage('Unknown error: failed to serialize message');
    }
  }
};

export default CliqzSecureMessage;
