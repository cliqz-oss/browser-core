import config from '../core/config';
import utils from '../core/utils';
import { Services } from './globals';
import { CHROME_MSG_SOURCE } from '../core/content/helpers';

const PROCESS_SCRIPT_URL = `${config.baseURL}platform/process-script.bundle.js`;
const FRAME_SCRIPT_URL = `${config.baseURL}core/frameScript.js`;

export default class ProcessScriptManager {
  dispatcher = (msg) => {
    const { origin, payload, windowId } = msg.data;
    const { action, module, requestId } = payload;

    let sent = false;

    this.dispatchMessage({
      ...msg,
      data: {
        ...msg.data,
        sendResponse: (response) => {
          // To implement chrome.runtime.sendMesssage specification
          // we make sure that `sendResponse` is called at most once
          if (sent) {
            return;
          }

          sent = true;
          this.broadcast(`window-${msg.data.windowId}`, {
            origin,
            response,
            action,
            module,
            requestId,
            windowId,
          });
        },
      }
    });
  }

  constructor(dispatcher) {
    this.dispatchMessage = dispatcher;
    this.timestamp = Date.now();
  }

  get ppmm() {
    return Services.ppmm;
  }

  get gmm() {
    return Services.mm;
  }

  get processScriptUrl() {
    return `${PROCESS_SCRIPT_URL}?t=${this.timestamp}`;
  }

  get frameScriptUrl() {
    return `${FRAME_SCRIPT_URL}?t=${this.timestamp}`;
  }

  init() {
    // on extension update or downgrade there might be a race condition
    // and we might end up having no process script
    utils.setTimeout(this.ppmm.loadProcessScript.bind(this.ppmm, this.processScriptUrl, true), 0);
    utils.setTimeout(this.gmm.loadFrameScript.bind(this.gmm, this.frameScriptUrl, true), 0);

    this.addMessageListener('cliqz', this.dispatcher);
  }

  unload() {
    this.removeMessageListener('cliqz', this.dispatcher);
    this.broadcast('cliqz:core', {
      action: 'unload'
    });
    this.broadcast('cliqz:process-script', {
      action: 'unload'
    });
    this.ppmm.removeDelayedProcessScript(this.processScriptUrl);
    this.gmm.removeDelayedFrameScript(this.frameScriptUrl);
  }

  broadcast(channel, msg) {
    /* eslint-disable no-param-reassign */
    if (typeof msg === 'object') {
      msg = {
        ...msg,
        source: CHROME_MSG_SOURCE
      };
    }

    this.ppmm.broadcastAsyncMessage(channel, msg);
    this.gmm.broadcastAsyncMessage(channel, msg);
  }

  addMessageListener(channel, cb) {
    this.ppmm.addMessageListener(channel, cb);
    this.gmm.addMessageListener(channel, cb);
  }

  removeMessageListener(channel, cb) {
    this.ppmm.removeMessageListener(channel, cb);
    this.gmm.removeMessageListener(channel, cb);
  }
}
