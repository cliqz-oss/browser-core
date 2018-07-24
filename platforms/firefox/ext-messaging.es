/* globals ExtensionUtils, ExtensionCommon */
import { Services, Components } from './globals';
import console from '../core/console';

Components.utils.import('resource://gre/modules/ExtensionUtils.jsm');
Components.utils.import('resource://gre/modules/ExtensionCommon.jsm');
const TMP = new ExtensionCommon.SchemaAPIManager();

// Firefox 52 does not implement initGlobal
if (TMP.initGlobal) {
  TMP.initGlobal();
}

const StructuredCloneHolder = TMP.global.StructuredCloneHolder;

const EXTENSION_ID = 'cliqz@cliqz.com';

const listeners = new Set();

function extensionMessageFilter({ data }) {
  data.forEach((msg) => {
    if (msg.recipient.extensionId === EXTENSION_ID) {
      const content = msg.data.deserialize(global);
      listeners.forEach((fn) => {
        try {
          fn({ message: content, sender: msg.sender.id });
        } catch (e) {
          console.error('unhandled error in message handler', e);
        }
      });
    }
  });
}

export default {
  onMessage: {
    addListener(fn) {
      if (listeners.size === 0) {
        Services.mm.addMessageListener('MessageChannel:Messages', extensionMessageFilter);
      }
      listeners.add(fn);
    },
    removeListener(fn) {
      listeners.delete(fn);
      if (listeners.size === 0) {
        Services.mm.removeMessageListener('MessageChannel:Messages', extensionMessageFilter);
      }
    },
  },
  sendMessage(extensionId, msg) {
    Services.mm.broadcastAsyncMessage('MessageChannel:Messages', [{
      messageName: 'Extension:Message',
      channelId: ExtensionUtils.getUniqueId(),
      sender: {
        id: EXTENSION_ID,
        extensionId: EXTENSION_ID,
      },
      recipient: {
        extensionId,
      },
      data: new StructuredCloneHolder(JSON.stringify(msg)),
      responseType: 3 // MessageChannel.RESPONSE_NONE
    }]);
  },
};
