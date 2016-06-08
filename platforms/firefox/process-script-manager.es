import { utils, events } from "core/cliqz";

const PROCESS_SCRIPT_URL = "chrome://cliqz/content/core/processScript.js";

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
  init() {
    this.mm = Cc["@mozilla.org/parentprocessmessagemanager;1"]
        .getService(Ci.nsIProcessScriptLoader);

    this.processScriptUrl = PROCESS_SCRIPT_URL + "?" + Date.now();
    this.mm.loadProcessScript(this.processScriptUrl, true);

    super.init();
  }

  unload() {
    super.unload();
    this.broadcast("cliqz:core", "unload");
    this.broadcast("cliqz:process-script", "unload");
    this.mm.removeDelayedProcessScript(this.processScriptUrl);
  }

  broadcast(channel, msg) {
    this.mm.broadcastAsyncMessage(channel, msg);
  }

  addMessageListener(channel, cb) {
    this.mm.addMessageListener(channel, cb);
  }

  removeMessageListener(channel, cb) {
    this.mm.removeMessageListener(channel, cb);
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

var appInfo = Cc["@mozilla.org/xre/app-info;1"]
      .getService(Ci.nsIXULAppInfo);
var versionChecker = Cc["@mozilla.org/xpcom/version-comparator;1"]
      .getService(Ci.nsIVersionComparator);

var Manager;

if (versionChecker.compare(appInfo.version, "38.0") >= 0) {
  Manager = ProcessScriptManager;
} else {
  Manager = GlobalProcessScriptManager;
}

export default Manager;
