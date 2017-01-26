import { utils } from "core/cliqz";
import background from "core/base/background";
import HumanWeb from "human-web/human-web";
import hs from "core/history-service";

/**
* @namespace human-web
* @class Background
*/
export default background({
  /**
  * @method enabled
  * @return pref
  */
  enabled(settings) {
    return utils.getPref("humanWeb", false);
  },

  /**
  * @method init
  */
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
    /**
    * @event ui:click-on-url
    */
    "ui:click-on-url": function (data) {
      HumanWeb.queryCache[data.url] = {
        d: 1,
        q: data.query,
        t: data.type,
        pt: data.positionType,
      };
    },
     /**
    * @event control-center:toggleHumanWeb
    */
    "control-center:toggleHumanWeb": function() {
      if(utils.getPref("humanWeb", false) && !utils.getPref('dnt', false)){
        HumanWeb.unloadAtBrowser();
      } else {
        HumanWeb.initAtBrowser();
      }

     utils.extensionRestart(function() {
       utils.setPref('dnt', !utils.getPref('dnt', false));
     });
    },
    "core:mouse-down": function onMouseDown() {
      HumanWeb.captureMouseClickPage.apply(HumanWeb, arguments);
    },
  },

  actions: {
    /**
    * @method actions.recordKeyPress
    */
    recordKeyPress() {
      HumanWeb.captureKeyPressPage.apply(HumanWeb, arguments);
    },
    /**
    * @method actions.recordMouseMove
    */
    recordMouseMove() {
      HumanWeb.captureMouseMovePage.apply(HumanWeb, arguments);
    },
    /**
    * @method actions.recordScroll
    */
    recordScroll() {
      HumanWeb.captureScrollPage.apply(HumanWeb, arguments);
    },
    /**
    * @method actions.recordCopy
    */
    recordCopy() {
      HumanWeb.captureCopyPage.apply(HumanWeb, arguments);
    }
  }
})
