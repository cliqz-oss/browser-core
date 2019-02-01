/* global window */

import Spanan from 'spanan';
import checkIfChromeReady from '../../core/content/ready-promise';
import createSpananWrapper from '../../core/helpers/spanan-module-wrapper';
import PairingUI from './ui';

class Cliqz {
  constructor() {
    const pairingBridge = createSpananWrapper('pairing');
    const coreBridge = createSpananWrapper('core');
    const api = new Spanan();
    this.pairing = pairingBridge.createProxy();
    this.core = coreBridge.createProxy();

    const UI = new PairingUI();

    api.export({
      onPairingInit(message) {
        UI.oninit(message);
      },
      onPairingDeviceAdded(message) {
        UI.ondeviceadded(message);
      },
      onPairingStarted(message) {
        UI.onpairing(message);
      },
      onPairingDone(message) {
        UI.onpaired(message);
      },
      onPairingRemoved(message) {
        UI.onunpaired(message);
      },
      onPairingMasterConnected(message) {
        UI.onmasterconnected(message);
      },
      onPairingMasterDisconnected(message) {
        UI.onmasterdisconnected(message);
      },
    }, {
      filter(message) {
        return Object.keys(this.actions).indexOf(message.action) >= 0;
      },
      transform: message => ({
        action: message.action,
        args: [message.message],
      }),
    });


    checkIfChromeReady().then(() => {
      chrome.runtime.onMessage.addListener((message) => {
        if (message.requestId) {
          pairingBridge.handleMessage({
            uuid: message.requestId,
            response: message.response
          });
          coreBridge.handleMessage({
            uuid: message.requestId,
            response: message.response
          });
        } else {
          api.handleMessage(message);
        }
      });
      UI.init(window, this.pairing, this.core.sendTelemetry.bind(this.core));
    }).catch((ex) => {
      // eslint-disable-next-line no-console
      console.error('Chrome was never ready', ex);
    });
  }
}

window.Cliqz = new Cliqz();
