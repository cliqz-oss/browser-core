import config from '../core/config';
import { Services } from './globals';

const PROCESS_SCRIPT_URL = `${config.baseURL}platform/process-script.bundle.js`;
const FRAME_SCRIPT_URL = `${config.baseURL}core/frameScript.js`;

export default class ProcessScriptManager {
  dispatcher = (msg) => {
    const { message, sender } = msg.data;
    const { requestId } = message;

    let sent = false;

    this.dispatchMessage(
      message,
      sender,
      (response) => {
        // To implement chrome.runtime.sendMesssage specification
        // we make sure that `sendResponse` is called at most once
        if (sent || response === undefined || !requestId) {
          return;
        }

        sent = true;
        this.broadcast(`window-${sender.windowId}`, {
          response,
          requestId,
        });
      },
    );
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

  init(app) {
    // on extension update or downgrade there might be a race condition
    // and we might end up having no process script
    setTimeout(this.ppmm.loadProcessScript.bind(this.ppmm, this.processScriptUrl, true), 0);
    setTimeout(this.gmm.loadFrameScript.bind(this.gmm, this.frameScriptUrl, true), 0);

    this.addMessageListener('cliqz', this.dispatcher);

    app.ready().then(() => {
      this.appReady = true;
      this.shareAppState(app);
    });
  }

  unload() {
    this.removeMessageListener('cliqz', this.dispatcher);
    this.broadcast('cliqz:core', {
      action: 'unload'
    });
    this.broadcast('cliqz:process-script', {
      action: 'unload'
    });
    this.gmm.broadcastAsyncMessage('cliqz:process-script', {
      action: 'unload'
    });
    this.ppmm.removeDelayedProcessScript(this.processScriptUrl);
    this.gmm.removeDelayedFrameScript(this.frameScriptUrl);
  }

  broadcast(channel, msg) {
    /* eslint-disable no-param-reassign */
    if (!channel) {
      channel = 'cliqz:core';
    }
    /* eslint-enable no-param-reassign */

    this.ppmm.broadcastAsyncMessage(channel, msg);
  }

  addMessageListener(channel, cb) {
    this.ppmm.addMessageListener(channel, cb);
    this.gmm.addMessageListener(channel, cb);
  }

  removeMessageListener(channel, cb) {
    this.ppmm.removeMessageListener(channel, cb);
    this.gmm.removeMessageListener(channel, cb);
  }

  shareAppState(app) {
    this.app = app;
    this.broadcast('cliqz:process-script', {
      action: 'updateGlobal',
      data: {
        app: this.app.status(),
      },
    });
  }

  onNewProcess(processId) {
    if (this.app && this.appReady) {
      this.broadcast(`cliqz:process-script-${processId}`, {
        action: 'updateGlobal',
        data: {
          app: this.app.status(),
        },
      });
    }
  }
}
