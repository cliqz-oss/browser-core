/* global window */
import Spanan from 'spanan';
import { CHROME_MSG_SOURCE, isCliqzContentScriptMsg } from '../../core/content/helpers';
import checkIfChromeReady from './ready-promise';

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
        } else if (message.action === 'addMessage') {
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
      if (!isCliqzContentScriptMsg(message)) {
        return;
      }

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
