import Rx from '../platform/lib/rxjs';
import background from '../core/base/background';
import { Window } from '../core/browser';
import prefs from '../core/prefs';
import utils from '../core/utils';
import { Services } from '../platform/globals';
import HistoryManager from '../core/history-manager';
import ObservableProxy from '../core/helpers/observable-proxy';
import { getDefaultEngine } from '../core/search-engines';

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
  init() {
    this.clicksEventProxy = new ObservableProxy();
    this.locationChangeEventProxy = new ObservableProxy();
    const clicks$ = this.clicksEventProxy.observable;
    const locationChanges$ = this.locationChangeEventProxy.observable;

    // For every click (or enter) on a cliqz result, start a new stream that
    // will wait for upcoming page load
    clicks$.mergeMap(({ url, resultType }) =>
      Rx.Observable
        // open a time window to capture location change
        .interval(5000)
        // wait only once
        .take(1)
        // merge with location-change that matches the url
        .withLatestFrom(locationChanges$.filter(({ url: u }) => u === url))
        .map(([, { status }]) => ({ resultType, status }))
    ).subscribe(({ status, resultType }) => {
      utils.telemetry({
        type: 'performance',
        action: 'response',
        response_code: status / 100,
        result_type: resultType,
        v: 1,
      });
    });
  },

  unload() {
  },

  beforeBrowserShutdown() {

  },

  events: {
    'content:location-change': function onLocationChange({ url, status }) {
      this.locationChangeEventProxy.next({
        url,
        status,
      });
    },

    'ui:click-on-url': function onClick({ url, rawResult: { style, type } }) {
      this.clicksEventProxy.next({
        url,
        resultType: style || type,
      });
    },
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

    HistoryManager.getStats((history) => {
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
        private_window: utils.isPrivateMode(window),
        distribution: prefs.get('distribution', ''),
        version_host: prefs.get('gecko.mstone', '', ''),
        version_dist: prefs.get('distribution.version', '', ''),
        install_date: prefs.get('install_date'),
        health_report_enabled: prefs.get('uploadEnabled', true, 'datareporting.healthreport.')
      };

      utils.telemetry(info);

      // for SERP ABC test, to be removed after the test has finished
      const group = prefs.get('serp_test', null);
      const isCliqzDefaultEngine = getDefaultEngine().name === 'Cliqz';
      utils.telemetry({ group, isCliqzDefaultEngine },
        false, 'metrics.experiments.serp.state');
    });
  },
});
