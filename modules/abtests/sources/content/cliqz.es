/* global window */
import Spanan from 'spanan';
import checkIfChromeReady from '../../core/content/ready-promise';
import createSpananForModule from '../../core/helpers/spanan-module-wrapper';

let INSTANCE = null;

class Cliqz {
  constructor() {
    const core = createSpananForModule('core');
    const abtests = createSpananForModule('abtests');
    const api = new Spanan();
    const cliqz = this;
    this.export = api.export;

    api.export({
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
      },
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

    const onPostMessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch (e) {
        return;
      }

      api.handleMessage(message);
      core.handleMessage(message);
      abtests.handleMessage(message);
    };

    const onMessage = (message) => {
      const msg = {
        uuid: message.requestId,
        response: message.response
      };
      api.handleMessage(msg);
      core.handleMessage(msg);
      abtests.handleMessage(msg);
    };

    checkIfChromeReady().then(() => {
      chrome.runtime.onMessage.addListener(onMessage);
      window.addEventListener('message', onPostMessage);

      window.addEventListener('unload', () => {
        chrome.runtime.onMessage.removeListener(onMessage);
        window.removeEventListener('message', onPostMessage);
      });
    }).catch((ex) => {
      // eslint-disable-next-line no-console
      console.error('Chrome was never ready', ex);
    });

    this.core = core.createProxy();
    this.abtests = abtests.createProxy();
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
