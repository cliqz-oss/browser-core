import { utils } from "core/cliqz";
import background from "core/base/background";
import HumanWeb from "human-web/human-web";
import hs from "core/history-service";
import Attrack from "antitracking/attrack";

export default background({
  enabled(settings) {
    return utils.getPref("humanWeb", false);
  },

  init(settings) {
    HumanWeb.initAtBrowser();
    utils.bindObjectFunctions(this.actions, this);
    hs.addObserver(HumanWeb.historyObserver, false);
  },

  unload() {
    hs.removeObserver(HumanWeb.historyObserver);

    HumanWeb.unloadAtBrowser();
    HumanWeb.unload();
  },

  beforeBrowserShutdown() {
    HumanWeb.unload();
  },

  events: {
    "ui:click-on-url": function (data) {
      HumanWeb.queryCache[data.url] = {
        d: 1,
        q: data.query,
        t: data.type,
        pt: data.positionType,
      };
    }
  },

  actions: {
    recordKeyPress() {
      HumanWeb.captureKeyPressPage.apply(HumanWeb, arguments);
    },
    recordMouseMove() {
      HumanWeb.captureMouseMovePage.apply(HumanWeb, arguments);
    },
    recordMouseDown() {
      HumanWeb.captureMouseClickPage.apply(HumanWeb, arguments);
      Attrack.cChecker.setContextFromEvent.apply(Attrack.cChecker, arguments);
    },
    recordScroll() {
      HumanWeb.captureScrollPage.apply(HumanWeb, arguments);
    },
    recordCopy() {
      HumanWeb.captureCopyPage.apply(HumanWeb, arguments);
    }
  }
})
