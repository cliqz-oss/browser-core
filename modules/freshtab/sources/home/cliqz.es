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
    const controlCenter = createSpananForModule('control-center');
    const antiPhishing = createSpananForModule('anti-phishing');
    const api = new Spanan();
    const cliqz = this;
    this.state = {};

    this.export = api.export;

    api.export({
      renderResults(response) {
        cliqz.storage.setState(() => ({
          results: response.results,
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
      controlCenter.handleMessage(msg);
      search.handleMessage(msg);
      api.handleMessage(msg);
      antiPhishing.handleMessage(msg);
    };

    checkIfChromeReady().then(() => {
      chrome.runtime.onMessage.addListener(onMessage);

      window.addEventListener('unload', () => {
        chrome.runtime.onMessage.removeListener(onMessage);
      });
    }).catch((ex) => {
      // eslint-disable-next-line no-console
      console.error('Chrome was never ready', ex);
    });

    this.freshtab = freshtab.createProxy();
    this.core = core.createProxy();
    this.search = search.createProxy();
    this.controlCenter = controlCenter.createProxy();
    this.antiPhishing = antiPhishing.createProxy();
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
