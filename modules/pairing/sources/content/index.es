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

    const UI = new PairingUI(window, this.pairing, this.core.sendTelemetry.bind(this.core));

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

    const onPostMessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch (e) {
        return;
      }

      api.handleMessage(message);
      coreBridge.handleMessage(message);
      pairingBridge.handleMessage(message);
    };

    const onMessage = (message) => {
      if (message.requestId) {
        const msg = {
          uuid: message.requestId,
          response: message.response
        };

        coreBridge.handleMessage(msg);
        pairingBridge.handleMessage(msg);
        return;
      }

      // For broadcast messages from pairing background
      const currentUrl = window.location.href;

      let matchesCurrentUrl = message.url === currentUrl;
      // wild card for cliqz URLS
      if (message.url
          && (message.url.indexOf('resource://cliqz') === 0
           || message.url.indexOf('chrome://cliqz') === 0)) {
        if (currentUrl.indexOf(message.url) === 0) {
          matchesCurrentUrl = true;
        }
      }

      if (!matchesCurrentUrl) {
        return;
      }

      api.handleMessage(message);
    };

    window.addEventListener('unload', () => {
      chrome.runtime.onMessage.removeListener(onMessage);
      window.removeEventListener('message', onPostMessage);
      UI.unload();
    });

    checkIfChromeReady().then(() => {
      chrome.runtime.onMessage.addListener(onMessage);
      window.addEventListener('message', onPostMessage);
      UI.init();
    }).catch((ex) => {
      // eslint-disable-next-line no-console
      console.error('Chrome was never ready', ex);
    });
  }
}

window.Cliqz = new Cliqz();
