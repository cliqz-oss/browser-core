/* global window */
import Spanan from 'spanan';
import checkIfChromeReady from '../../core/content/ready-promise';
import createSpananForModule from '../../core/helpers/spanan-module-wrapper';

let INSTANCE = null;

class Cliqz {
  constructor() {
    const freshtab = createSpananForModule('freshtab');
    const core = createSpananForModule('core');
    const search = createSpananForModule('search');
    const offersV2 = createSpananForModule('offers-v2');
    const controlCenter = createSpananForModule('control-center');
    const cliqzForFriends = createSpananForModule('cliqz-for-friends');
    const api = new Spanan();
    const cliqz = this;
    this.state = {};

    this.export = api.export;

    api.export({
      renderResults(results) {
        cliqz.storage.setState(() => ({
          results,
        }));
      },
      closeNotification(messageId) {
        cliqz.storage.setState((prevState) => {
          const messages = Object.assign({}, prevState.messages);
          delete messages[messageId];
          return {
            messages,
          };
        });
      },
      addMessage(message) {
        cliqz.storage.setState(prevState => ({
          messages: {
            ...prevState.messages,
            [message.id]: message,
          }
        }));
      }
    }, {
      filter(message) {
        return Object.keys(this.actions).indexOf(message.action) >= 0;
      },
      transform: (message) => {
        if (message.action === 'closeNotification') {
          return {
            action: message.action,
            args: [message.messageId],
          };
        }
        if (message.action === 'addMessage') {
          return {
            action: message.action,
            args: [message.message],
          };
        }
        return message;
      }
    });

    const onMessage = (message) => {
      const msg = {
        ...message,
        uuid: message.requestId,
      };

      core.handleMessage(msg);
      freshtab.handleMessage(msg);
      offersV2.handleMessage(msg);
      controlCenter.handleMessage(msg);
      search.handleMessage(msg);
      api.handleMessage(msg);
      cliqzForFriends.handleMessage(msg);
    };

    checkIfChromeReady().then(() => {
      chrome.runtime.onMessage.addListener(onMessage);

      window.addEventListener('unload', () => {
        chrome.runtime.onMessage.removeListener(onMessage);
      });

      if (chrome.omnibox2) {
        chrome.omnibox2.focus();
      }
    }).catch((ex) => {
      // eslint-disable-next-line no-console
      console.error('Chrome was never ready', ex);
    });

    this.freshtab = freshtab.createProxy();
    this.core = core.createProxy();
    this.offersV2 = offersV2.createProxy();
    this.search = search.createProxy();
    this.controlCenter = controlCenter.createProxy();
    this.cliqzForFriends = cliqzForFriends.createProxy();
  }

  static getInstance() {
    if (!INSTANCE) {
      INSTANCE = new Cliqz();
    }

    return INSTANCE;
  }

  setStorage(storage) {
    this.storage = storage;
  }
}


export default Cliqz.getInstance();
