/* global window */
import checkIfChromeReady from '../core/content/ready-promise';
import createSpananForModule from '../core/helpers/spanan-module-wrapper';

class Cliqz {
  constructor() {
    const onboarding = createSpananForModule('onboarding-v4');
    const core = createSpananForModule('core');
    this.state = {};

    const onMessage = (message) => {
      const msg = {
        ...message,
        uuid: message.requestId,
      };

      core.handleMessage(msg);
      onboarding.handleMessage(msg);
    };

    checkIfChromeReady().then(() => {
      const unloadListener = () => {
        chrome.runtime.onMessage.removeListener(onMessage);
        window.removeEventListener('unload', unloadListener);
      };

      window.addEventListener('unload', unloadListener);
      chrome.runtime.onMessage.addListener(onMessage);
    }).catch((ex) => {
      // eslint-disable-next-line no-console
      console.error('Chrome was never ready', ex);
    });

    this.onboarding = onboarding.createProxy();
    this.core = core.createProxy();
  }

  setStorage(storage) {
    this.storage = storage;
  }
}

export default new Cliqz();
