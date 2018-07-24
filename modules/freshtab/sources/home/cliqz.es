/* global window */
import Spanan from 'spanan';
import { isCliqzContentScriptMsg } from '../../core/content/helpers';
import checkIfChromeReady from './ready-promise';
import createSpananForModule from '../../core/helpers/spanan-module-wrapper';

let INSTANCE = null;

class Cliqz {
  constructor() {
    const freshtab = createSpananForModule('freshtab');
    const core = createSpananForModule('core');
    const search = createSpananForModule('search');
    const offersV2 = createSpananForModule('offers-v2');
    const controlCenter = createSpananForModule('control-center');
    const api = new Spanan();
    const cliqz = this;

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
      freshtab.handleMessage(message);
      offersV2.handleMessage(message);
      controlCenter.handleMessage(message);
    };

    const onMessage = (message) => {
      const msg = {
        uuid: message.requestId,
        response: message.response,
        action: message.action,
        args: message.args,
      };

      if (isCliqzContentScriptMsg(message)) {
        core.handleMessage(msg);
        freshtab.handleMessage(msg);
        offersV2.handleMessage(msg);
        controlCenter.handleMessage(msg);
        search.handleMessage(msg);
        return;
      }

      api.handleMessage(msg);
    };

    checkIfChromeReady().then(() => {
      chrome.runtime.onMessage.addListener(onMessage);
      window.addEventListener('message', onPostMessage);

      window.addEventListener('unload', () => {
        chrome.runtime.onMessage.removeListener(onMessage);
        window.removeEventListener('message', onPostMessage);
      });
    });

    this.freshtab = freshtab.createProxy();
    this.core = core.createProxy();
    this.offersV2 = offersV2.createProxy();
    this.search = search.createProxy();
    this.controlCenter = controlCenter.createProxy();
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
