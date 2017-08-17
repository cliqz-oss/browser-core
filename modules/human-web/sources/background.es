import utils from "../core/utils";
import background from "../core/base/background";
import HumanWeb from "./human-web";
import { legacy as hs } from "../platform/history-service";
import inject from "../core/kord/inject";

/**
* @namespace human-web
* @class Background
*/
export default background({
  hpn: inject.module('hpn'),
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
    let FF48_OR_ABOVE = false;

    try {
      const appInfo = Components.classes['@mozilla.org/xre/app-info;1']
        .getService(Components.interfaces.nsIXULAppInfo);
      const versionChecker = Components.classes['@mozilla.org/xpcom/version-comparator;1']
        .getService(Components.interfaces.nsIVersionComparator);

      if (versionChecker.compare(appInfo.version, '48.0') >= 0) {
        FF48_OR_ABOVE = true;
      }
    } catch (e) { utils.log(e); }

    if (FF48_OR_ABOVE) {
      this.enabled = true;
      HumanWeb.initAtBrowser();
      HumanWeb.hpn = this.hpn;
      utils.bindObjectFunctions(this.actions, this);
      hs.addObserver(HumanWeb.historyObserver, false);
    } else {
      this.enabled = false;
    }
  },

  unload() {
    if (this.enabled) {
      hs.removeObserver(HumanWeb.historyObserver);
      HumanWeb.unloadAtBrowser();
      HumanWeb.unload();
    }
  },

  beforeBrowserShutdown() {
    if (this.enabled) {
      HumanWeb.unload();
    }
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
      // 1. we turn off HumanWeb module
      utils.setPref('modules.human-web.enabled', false);

      // 2. change the pref
      utils.setPref('dnt', !utils.getPref('dnt', false));

      // we need to avoid the throttle on prefs
      utils.setTimeout(function() {
        //3. start again the module
        utils.setPref('modules.human-web.enabled', true);
      }, 0);
    },
    "core:mouse-down": function onMouseDown() {
      HumanWeb.captureMouseClickPage.apply(HumanWeb, arguments);
    },
    "core:key-press": function onKeyPress() {
      HumanWeb.captureKeyPressPage.apply(HumanWeb, arguments);
    },
    "core:mouse-move": function onMouseMove() {
      HumanWeb.captureMouseMovePage.apply(HumanWeb, arguments);
    },
    "core:scroll": function onScroll() {
      HumanWeb.captureScrollPage.apply(HumanWeb, arguments);
    },
    "core:copy": function onCopy() {
      HumanWeb.captureCopyPage.apply(HumanWeb, arguments);
    }
  },

  actions: {

    /**
     * Check whether there is some state for this url.
     * @param  {String}  url
     * @return {Boolean}     true if a state object exists.
     */
    isProcessingUrl(url) {
      return HumanWeb.state.v[url] !== undefined;
    },

    /**
     * Add some data to the metadata for a url under the specified key. If data
     * already exists, we will merge it, overwriting any duplicates.
     *
     * @param {String} url
     * @param {String} key  object key under-which to add this data
     * @param {Object} data data to add
     * @returns {Promise} Resolves if data was added, rejects if we have no state
     * for this url.
     */
    addDataToUrl(url, key, data) {
      if (HumanWeb.state.v[url]) {
        HumanWeb.state.v[url][key] = Object.keys(data).reduce((acc, val) => {
          acc[val] = data[val];
          return acc;
        }, HumanWeb.state.v[url][key] || {});
        return Promise.resolve();
      }
      return Promise.reject();
    },

    telemetry(payload, instantPush) {
      HumanWeb.telemetry(payload, instantPush);
    }
  }
})
