import Demo from './demo';
import Redirect from './redirect';
import utils from '../core/utils';
import events from '../core/events';
import HistoryManager from '../core/history-manager';
import { Services } from '../platform/globals';
import LocationObserver from '../platform/location-observer';
import TabObserver from '../platform/tab-observer';

export default class {
  constructor(settings) {
    this.window = settings.window;
    this.INFO_INTERVAL = 60 * 60 * 1e3; // 1 hour
  }

  init() {
    // Create observers
    const locationObserver = new LocationObserver(this.window);
    const tabObserver = new TabObserver(this.window);

    // Create event proxies
    this.locationChangeEvent = events.proxyEvent(
      'core.location_change',
      locationObserver,
      'location_change'
    );
    this.tabLocationChangeEvent = events.proxyEvent(
      'core.tab_location_change',
      tabObserver,
      'location_change'
    );
    this.tabStateChangeEvent = events.proxyEvent(
      'core.tab_state_change',
      tabObserver,
      'state_change'
    );
    this.tabSelectEventProxy = events.proxyEvent(
      'core:tab_select',
      this.window.gBrowser.tabContainer,
      'TabSelect'
    );

    // Demo rely on UI
    utils.setTimeout(() => {
      Demo.init(this.window);
    }, 2000);

    Redirect.addHttpObserver();

    return this.whoAmI();
  }

  unload() {
    // Unsubsribe event proxies
    this.locationChangeEvent.unsubscribe();
    this.tabLocationChangeEvent.unsubscribe();
    this.tabStateChangeEvent.unsubscribe();
    this.tabSelectEventProxy.unsubscribe();
    Demo.unload(this.window);
    Redirect.unload();

    clearTimeout(this.whoAmItimer);
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
