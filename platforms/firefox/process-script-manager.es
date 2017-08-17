import utils from 'core/utils';
import events from 'core/events';

const PROCESS_SCRIPT_URL = 'chrome://cliqz/content/core/processScript.js';
const FRAME_SCRIPT_URL = 'chrome://cliqz/content/core/frameScript.js';

class BaseProcessScriptLoader {

  constructor(dispatcher) {
    this.dispatchMessage = dispatcher;
  }

  init() {
    this.addMessageListener("cliqz", this.dispatchMessage);
  }

  unload() {
    this.removeMessageListener("cliqz", this.dispatchMessage);
  }

}

/**
 * Firefox >= 38
 */
class ProcessScriptManager extends BaseProcessScriptLoader {
  constructor(dispatcher) {
    super(dispatcher);
    this.timestamp = Date.now();
  }

  get ppmm() {
    return Cc["@mozilla.org/parentprocessmessagemanager;1"]
        .getService(Ci.nsIProcessScriptLoader);
  }

  get gmm() {
    return Cc["@mozilla.org/globalmessagemanager;1"]
      .getService(Ci.nsIMessageListenerManager);
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

    super.init();
  }

  unload() {
    super.unload();
    this.broadcast("cliqz:core", "unload");
    this.broadcast("cliqz:process-script", "unload");
    this.ppmm.removeDelayedProcessScript(this.processScriptUrl);
    this.gmm.removeDelayedFrameScript(this.frameScriptUrl);
  }

  broadcast(channel, msg) {
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

/**
 * Firefox < 38
 * instead of process script message manager uses CliqzEvents
 */
class GlobalProcessScriptManager extends BaseProcessScriptLoader {
  init() {
    super.init();
    Services.scriptloader.loadSubScript(PROCESS_SCRIPT_URL);
  }

  unload() {
    Cu.unload(PROCESS_SCRIPT_URL);
    super.unload();
  }

  broadcast(channel, msg) {
    events.pub(`process-script-${channel}`, { data: msg });
  }

  addMessageListener(channel, cb) {
    events.sub(`process-script-${channel}`, cb);
  }

  removeMessageListener(channel, cb) {
    events.un_sub(`process-script-${channel}`, cb);
  }
}

const appInfo = Cc["@mozilla.org/xre/app-info;1"]
      .getService(Ci.nsIXULAppInfo);
const versionChecker = Cc["@mozilla.org/xpcom/version-comparator;1"]
      .getService(Ci.nsIVersionComparator);

let Manager;

if (versionChecker.compare(appInfo.version, "38.0") >= 0) {
  Manager = ProcessScriptManager;
} else {
  Manager = GlobalProcessScriptManager;
}

export default Manager;
