/* global window */

import Spanan from 'spanan';

import { CHROME_MSG_SOURCE, isCliqzContentScriptMsg } from '../../core/content/helpers';
import checkIfChromeReady from './ready-promise';
import PairingUI from './ui';

function createSpananForModule(moduleName) {
  return new Spanan(({ uuid, action, args }) => {
    const message = {
      source: CHROME_MSG_SOURCE,
      target: 'cliqz',
      module: moduleName,
      action,
      requestId: uuid,
      args
    };
    chrome.runtime.sendMessage(message);
  });
}

class Cliqz {
  constructor() {
    const pairingBridge = createSpananForModule('pairing');
    const coreBridge = createSpananForModule('core');
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
      if (!isCliqzContentScriptMsg(message)) {
        return;
      }
      const msg = {
        uuid: message.requestId,
        response: message.response
      };
      api.handleMessage(msg);
      coreBridge.handleMessage(msg);
      pairingBridge.handleMessage(msg);
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
    });
  }
}

window.Cliqz = new Cliqz();
