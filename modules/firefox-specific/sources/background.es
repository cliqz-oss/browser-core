import background from '../core/base/background';
import { Window } from '../core/browser';
import prefs from '../core/prefs';
import utils from '../core/utils';
import { Services } from '../platform/globals';
import HistoryManager from '../core/history-manager';

/**
  @namespace firefox-specific
  @module firefox-specific
  @class Background
 */
export default background({

  requiresServices: ['cliqz-config'],

  /**
    @method init
    @param settings
  */
  init(settings) {
  },

  unload() {
  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {

  },

  whoAmI({ startup, windowId }) {
    (Services.search.init ?
      new Promise(resolve => Services.search.init(resolve)) :
      Promise.resolve()
    ).then(() => this.sendEnvironmentalSignal({
      startup,
      defaultSearchEngine: Services.search.currentEngine.name,
      windowId,
    }));
  },

  sendEnvironmentalSignal({ startup, defaultSearchEngine, windowId }) {
    const screenWidth = { value: 0 };
    const screenHeight = { value: 0 };
    let screenMan;
    const window = Window.findById(windowId).window;

    /* eslint-disable */
    try {
      screenMan = Components.classes['@mozilla.org/gfx/screenmanager;1']
        .getService(Components.interfaces.nsIScreenManager);
      // our eslint rules do not like GetRect being not a constructor
      screenMan.primaryScreen.GetRect({}, {}, screenWidth, screenHeight);
    } catch (e) {
      // our eslint rules do not like empty catch
    }
    /* eslint-enable */

    HistoryManager.getStats(history => {
      const document = window.document;
      const navigator = window.navigator;
      const browserContainer = document.getElementById('browser');
      const info = {
        type: 'environment',
        agent: navigator.userAgent,
        language: navigator.language,
        width: document.width,
        height: document.height,
        inner_height: browserContainer.clientHeight,
        inner_width: browserContainer.clientWidth,
        screen_width: screenWidth.value,
        screen_height: screenHeight.value,
        version: utils.extensionVersion,
        history_days: history.days,
        history_urls: history.size,
        startup: Boolean(startup),
        prefs: utils.getCliqzPrefs(),
        defaultSearchEngine,
        isDefaultBrowser: utils.isDefaultBrowser(),
        private_window: utils.isPrivate(window),
        distribution: prefs.get('distribution', ''),
        version_host: prefs.get('gecko.mstone', '', ''),
        version_dist: prefs.get('distribution.version', '', ''),
        install_date: prefs.get('install_date'),
      };

      utils.telemetry(info);
    });
  },
});
