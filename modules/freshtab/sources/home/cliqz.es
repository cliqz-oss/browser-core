/* global window */
import Spanan from 'spanan';

function createSpananForModule(moduleName) {
  return new Spanan(({ uuid, functionName, args }) => {
    const message = {
      target: 'cliqz',
      module: moduleName,
      action: functionName,
      requestId: uuid,
      args
    };
    chrome.runtime.sendMessage(message);
  });
}

let INSTANCE = null;

class Cliqz {
  constructor() {
    const freshtab = createSpananForModule('freshtab');
    const core = createSpananForModule('core');
    const cliqz = this;

    this.export = Spanan.export;

    Spanan.export({
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

      Spanan.dispatch(message);
    };

    const onMessage = (message) => {
      Spanan.dispatch({
        uuid: message.requestId,
        returnedValue: message.response
      });
    };

    chrome.runtime.onMessage.addListener(onMessage);
    window.addEventListener('message', onPostMessage);

    window.addEventListener('unload', () => {
      chrome.runtime.onMessage.removeListener(onMessage);
      window.removeEventListener('message', onPostMessage);
    });

    this.freshtab = freshtab.createProxy();
    this.core = core.createProxy();
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
