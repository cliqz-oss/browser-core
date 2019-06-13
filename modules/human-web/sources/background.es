/* eslint func-names: 'off' */

import telemetry from '../core/services/telemetry';
import prefs from '../core/prefs';
import background from '../core/base/background';
import HumanWeb from './human-web';
import history from '../core/history-service';
import inject from '../core/kord/inject';
import WebRequest from '../core/webrequest';
import logger from './logger';
import { fixURL, getDetailsFromUrl } from '../core/url';

/**
* @namespace human-web
* @class Background
*/
export default background({
  requiresServices: ['cliqz-config', 'telemetry'],

  hpn: inject.module('hpnv2'),
  searchSession: inject.service('search-session', ['encodeSessionParams']),
  telemetry: inject.service('telemetry', ['isEnabled']),
  /**
  * @method enabled
  * @return pref
  */
  enabled() {
    return prefs.get('humanWeb', true)
      && !prefs.get('humanWebOptOut', false);
  },

  /**
  * @method init
  */
  init(settings) {
    // Protection: By default, skip all human web listeners.
    // Only allow it if the user has not opted out
    // and if human web is fully initialized.
    //
    // (Note: Opt-out is clear, but the reason why it is also disabled
    //  during initialization is mainly to prevent any race conditions
    //  that we would otherwise had to deal with. Startup should
    //  not take too long, anyway.)
    this.collecting = false;
    this.settings = settings;

    this.humanWeb = HumanWeb;
    HumanWeb.hpn = this.hpn;

    const pendingInit = (this._pendingInits || Promise.resolve()).then(() => {
      if (!this.enabled()) {
        // The module is technically loaded, but human web will not collect any data.
        this.active = true;
        this.collecting = false;
        return undefined;
      }

      return HumanWeb.init().then(() => {
        this.onHeadersReceivedListener = (...args) =>
          HumanWeb.httpObserver.observeActivity(...args);
        WebRequest.onHeadersReceived.addListener(this.onHeadersReceivedListener, {
          urls: ['*://*/*'],
        }, ['responseHeaders']);

        if (history && history.onVisitRemoved) {
          this.onVisitRemovedListener = (...args) => HumanWeb.onVisitRemoved(...args);
          history.onVisitRemoved.addListener(this.onVisitRemovedListener);
        }

        this.active = true;
        this.collecting = true;
      });
    });
    this._pendingInits = pendingInit.catch(() => {});
    return pendingInit;
  },

  unload() {
    this.collecting = false;

    if (this.active) {
      this.active = false;

      if (this.onVisitRemovedListener) {
        history.onVisitRemoved.removeListener(this.onVisitRemovedListener);
        this.onVisitRemovedListener = undefined;
      }

      if (this.onHeadersReceivedListener) {
        WebRequest.onHeadersReceived.removeListener(this.onHeadersReceivedListener);
        this.onHeadersReceivedListener = undefined;
      }

      HumanWeb.unload();
    }
  },

  async reload() {
    await this._pendingInits;
    this.unload();
    await this.init(this.settings);
  },

  beforeBrowserShutdown() {
    HumanWeb.unload();
  },

  events: {
    /**
     * When the user opts-out of the Human Web data collection,
     * 'humanWebOptOut' will be set by the UI. Whenever this
     * preference changes, we have to reload Human Web to make
     * sure that the local data collection will be stopped.
     *
     * In Cliqz, the user has two ways to opt-out:
     * - Control Center UI (Search Options --> Human Web)
     * - chrome://cliqz/content/human-web/humanweb.html (AMO only)
     *
     * In Ghostery, the mechanism is different. If the user
     * opts-out, the whole 'human-web' module gets unloaded.
     */
    async prefchange(pref) {
      if (pref === 'humanWebOptOut') {
        try {
          await this.reload();
          await telemetry.push({
            type: 'humanWebStatus',
            state: this.actions.getStatus(),
          });
        } catch (e) {
          logger.error(e);
        }
      }
    },

    /**
    * @event ui:click-on-url
    */
    'ui:click-on-url': function (data) {
      if (data.isPrivateMode || !this.collecting) {
        return;
      }

      HumanWeb.queryCache[data.url] = {
        d: 1,
        q: data.query,
        t: data.isPrivateResult ? 'othr' : 'cl',
        pt: data.positionType || '',
      };

      const signal = {
        type: 'extension-result-telemetry',
        q: data.query,
        s: this.searchSession.encodeSessionParams(),
        msg: {
          i: data.rawResult.index,
          o: `&o=${encodeURIComponent(JSON.stringify(data.resultOrder))}`,
          u: data.url,
          a: data.isFromAutocompletedURL,
        },
        endpoint: this.settings.RESULTS_PROVIDER_LOG,
        method: 'GET',
      };

      if (this.telemetry.isEnabled()) {
        HumanWeb.sanitizeResultTelemetry(signal)
          .then(({ query, url, data: _data }) => HumanWeb.sendResultTelemetry(query, url, _data))
          .catch(logger.error);
      }
    },

    /**
     * @event control-center:toggleHumanWeb
     */
    'control-center:toggleHumanWeb': () => {
      // note: will trigger the 'prefchange' listener
      prefs.set('humanWebOptOut', !prefs.get('humanWebOptOut', false));
    },

    'core:mouse-down': function onMouseDown(...args) {
      if (this.collecting) {
        HumanWeb.captureMouseClickPage(...args);
      }
    },
    'content:location-change': function onLocationChange(...args) {
      if (this.collecting) {
        // Only forward it to the onLocation change if the frameID is type 0.

        // We need to find a better way,
        // to not trigger on-location change for requests which are not main_document.
        HumanWeb.listener.onLocationChange(...args);
      }
    }
  },

  actions: {
    async getURLCheckStatus(url) {
      const cleanHost = getDetailsFromUrl(url).cleanHost;
      return {
        host: await HumanWeb.doublefetchHandler
          .anonymousHttpGet(`https://${cleanHost}`)
          .then(() => HumanWeb.network.dns.resolveHost(cleanHost)),
        isHostPrivate: await HumanWeb.network.isHostNamePrivate(fixURL(url)),
        isPagePrivate: await HumanWeb.isAlreadyMarkedPrivate(url, () => { }),
        quorumConsent: await HumanWeb.sha1(url)
          .then(e => HumanWeb.getQuorumConsent(e)),
      };
    },

    async getState({
      msg,
    }) {
      return {
        allOpenPages: await HumanWeb.getAllOpenPages(),
        counter: HumanWeb.counter,
        countryCode: HumanWeb.getCountryCode(),
        oc: HumanWeb.oc,
        quorumOtherUrl: await HumanWeb.quorumCheckOtherUrls(msg),
        rulesets: Object.values(HumanWeb.contentExtractor.patterns.normal.extractRules),
        state: HumanWeb.state,
        strictQueries: HumanWeb.strictQueries,
        trk: HumanWeb.trk,
      };
    },

    getStatus() {
      return prefs.get('humanWebOptOut', false);
    },

    setStatus(status) {
      // note: will trigger the 'prefchange' listener
      prefs.set('humanWebOptOut', status);
    },
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
    },

    'hw:keypress': function onKeyPress(...args) {
      if (this.collecting) {
        HumanWeb.captureKeyPressPage(...args);
      }
    },
    'hw:mousemove': function onMouseMove(...args) {
      if (this.collecting) {
        HumanWeb.captureMouseMovePage(...args);
      }
    },
    'hw:scroll': function onScroll(...args) {
      if (this.collecting) {
        HumanWeb.captureScrollPage(...args);
      }
    },
    'hw:copy': function onCopy(...args) {
      if (this.collecting) {
        HumanWeb.captureCopyPage(...args);
      }
    },

    contentScriptTopAds() {
    },

    contentScriptHTML() {
    },

    jsRedirect(message) {
      HumanWeb.httpCache[message.message.url] = {
        status: 301,
        time: HumanWeb.counter,
        location: message.message.location
      };
    },

    adClick(message) {
      const ads = message.ads;
      Object.keys(ads).forEach((eachAd) => {
        HumanWeb.adDetails[eachAd] = ads[eachAd];
      });
    }

  }
});
