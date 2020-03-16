/* global content, addMessageListener, sendAsyncMessage */

/**
 * This script is injected into <browser> hosting search results document. It:
 * 1. Forwards incoming `Dropdown:MessageIn` messages from `browser.messageManager`
 *    to the document with `postMessage`.
 * 2. Forwards outgoing messages sent from document with `postMessage` back
 *    through `browser.messageManager` as `Dropdown:MessageOut`.
 * 3. Forwards `DOMContentLoaded` event through `browser.messageManager` as
 *    `Dropdown:BrowserContentLoaded`.
 *
 * TODO: this tricky scheme probably should be replaced with normal extension messaging.
 */
const incomingMessages = new Set();
let messageId = 1;

addMessageListener('Dropdown:MessageIn', {
  receiveMessage({ data }) {
    messageId += 1;
    data.messageId = messageId; // eslint-disable-line
    incomingMessages.add(data.messageId);
    content.window.postMessage(data, '*');
  },
});

// eslint-disable-next-line no-undef
addEventListener('message', (ev) => {
  const message = ev.data;
  try {
    if (incomingMessages.delete(message.messageId)) {
      // ignore own messages
      return;
    }
  } catch (e) {
    //
  }

  delete message.messageId;

  sendAsyncMessage('Dropdown:MessageOut', message);
}, true, true);

addEventListener('DOMContentLoaded', () => {
  sendAsyncMessage('Dropdown:BrowserContentLoaded', {
    url: content.location.href
  });
}, true);
