import Demo from './demo';
import Redirect from './redirect';
import utils from '../core/utils';
import events from '../core/events';
import HistoryManager from '../core/history-manager';
import { Services } from '../platform/globals';
import { Window } from '../core/browser';

export default class {
  constructor(settings) {
    this.window = settings.window;
    this.INFO_INTERVAL = 60 * 60 * 1e3; // 1 hour
  }

  init() {
    this.tabSelectEventProxy = events.proxyEvent(
      'core:tab_select',
      this.window.gBrowser.tabContainer,
      'TabSelect',
      undefined,
      function (event) {
        const tab = event.target;
        const browser = tab.linkedBrowser;
        const win = new Window(tab.ownerGlobal);
        const msg = {
          windowId: win.id,
          url: browser.currentURI.spec,
          isPrivate: browser.loadContext.usePrivateBrowsing,
        };
        return [msg];
      }
    );

    // Demo rely on UI
    utils.setTimeout(() => {
      Demo.init(this.window);
    }, 2000);

    Redirect.addHttpObserver();

    return this.whoAmI(true);
  }

  unload() {
    // Unsubsribe event proxies
    this.tabSelectEventProxy.unsubscribe();
    Demo.unload(this.window);
    Redirect.unload();

    utils.clearTimeout(this.whoAmItimer);
  }

  whoAmI(startup) {
    // schedule another signal
    this.whoAmItimer = utils.setTimeout(this.whoAmI.bind(this), this.INFO_INTERVAL);

    // executed after the services are fetched
    return utils.fetchAndStoreConfig().then(() => {
      // wait for search component initialization
      if (Services.search.init) {
        Services.search.init(() => {
          this.sendEnvironmentalSignal(startup, Services.search.currentEngine.name);
        });
      } else {
        this.sendEnvironmentalSignal(startup, Services.search.currentEngine.name);
      }
    });
  }

  sendEnvironmentalSignal(startup, defaultSearchEngine) {
    const screenWidth = { value: 0 };
    const screenHeight = { value: 0 };
    let screenMan;

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
      const window = this.window;
      const document = this.window.document;
      const navigator = this.window.navigator;
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
        distribution: utils.getPref('distribution', ''),
        version_host: utils.getPref('gecko.mstone', '', ''),
        version_dist: utils.getPref('distribution.version', '', ''),
        install_date: utils.getPref('install_date'),
      };

      utils.telemetry(info);
    });
  }
}
