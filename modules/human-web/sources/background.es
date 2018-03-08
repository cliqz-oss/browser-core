import utils from '../core/utils';
import background from '../core/base/background';
import HumanWeb from './human-web';
import history from '../core/history-service';
import inject from '../core/kord/inject';
import WebRequest from '../core/webrequest';
import { isFirefox, isPlatformAtLeastInVersion } from '../core/platform';

/**
* @namespace human-web
* @class Background
*/
export default background({
  requiresServices: ['cliqz-config'],

  hpn: inject.module('hpn'),
  /**
  * @method enabled
  * @return pref
  */
  enabled() {
    return utils.getPref("humanWeb", true)
           && !utils.getPref("humanWebOptOut", false)
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

    this.humanWeb = HumanWeb;
    HumanWeb.hpn = this.hpn;

    const FF48_OR_ABOVE = isPlatformAtLeastInVersion('48.0');
    if (isFirefox && !FF48_OR_ABOVE) {
      this.active = false;
      return Promise.resolve();
    }

    return Promise.resolve().then(() => {

      if (!this.enabled()) {
        // The module is technically loaded, but human web will not collect any data.
        this.active = true;
        this.collecting = false;
        return;
      }

      return HumanWeb.init().then(() => {

        this.onHeadersReceivedListener = (...args) => HumanWeb.httpObserver.observeActivity(...args);
        WebRequest.onHeadersReceived.addListener(this.onHeadersReceivedListener, {
          urls: ['*://*/*'],
        }, ['responseHeaders']);

        // If it's chrome, we need to add a domain2IP dict.
        // Need to move it to a more platform friendly place.
        if (WebRequest.onCompleted) {
          this.domain2IPListener = (...args) => this.domain2IP(...args);
          WebRequest.onCompleted.addListener(this.domain2IPListener, { urls: ['http://*/*', 'https://*/*'], tabId: -1 });
        }

        utils.bindObjectFunctions(this.actions, this);

        if (history && history.onVisitRemoved) {
          this.onVisitRemovedListener = (...args) => HumanWeb.onVisitRemoved(...args);
          history.onVisitRemoved.addListener(this.onVisitRemovedListener);
        }

        this.active = true;
        this.collecting = true;
      });
    });
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

      if (this.domain2IPListener) {
        WebRequest.onCompleted.removeListener(this.domain2IPListener);
        this.domain2IPListener = undefined;
      }

      HumanWeb.unload();
    }
  },

  beforeBrowserShutdown() {
    HumanWeb.unload();
  },

  domain2IP(requestDetails) {
    if (requestDetails && requestDetails.ip) {
      const domain = HumanWeb.parseURL(requestDetails.url).hostname;
      HumanWeb.domain2IP[domain] = { ip: requestDetails.ip, ts: Date.now() };
    }
  },

  events: {
    'human-web:sanitize-result-telemetry': function () {
      HumanWeb.sanitizeResultTelemetry(...arguments)
        .then(({ query, url, data }) => HumanWeb.sendResultTelemetry(query, url, data))
        .catch(error => console.log(HumanWeb.LOG_KEY, error));
    },
    /**
    * @event ui:click-on-url
    */
    'ui:click-on-url': function (data) {
      if (this.collecting) {
        HumanWeb.queryCache[data.url] = {
          d: 1,
          q: data.query,
          t: data.isPrivateResult ? 'othr' : 'cl',
          pt: data.positionType || '',
        };
      }
    },
     /**
    * @event control-center:toggleHumanWeb
    */
    'control-center:toggleHumanWeb': function() {
      // 1. we turn off HumanWeb module
      utils.setPref('modules.human-web.enabled', false);

      // 2. change the pref
      utils.setPref('humanWebOptOut', !utils.getPref('humanWebOptOut', false));

      // we need to avoid the throttle on prefs
      utils.setTimeout(function() {
        //3. start again the module
        utils.setPref('modules.human-web.enabled', true);
      }, 0);
    },
    'core:mouse-down': function onMouseDown() {
      if (this.collecting) {
        HumanWeb.captureMouseClickPage.apply(HumanWeb, arguments);
      }
    },
    'core:key-press': function onKeyPress() {
      if (this.collecting) {
        HumanWeb.captureKeyPressPage.apply(HumanWeb, arguments);
      }
    },
    'core:mouse-move': function onMouseMove() {
      if (this.collecting) {
        HumanWeb.captureMouseMovePage.apply(HumanWeb, arguments);
      }
    },
    'core:scroll': function onScroll() {
      if (this.collecting) {
        HumanWeb.captureScrollPage.apply(HumanWeb, arguments);
      }
    },
    'core:copy': function onCopy() {
      if (this.collecting) {
        HumanWeb.captureCopyPage.apply(HumanWeb, arguments);
      }
    },
    'content:location-change': function onLocationChange({ isPrivate, isLoadingDocument, url, referrer, frameId }) {
      if (this.collecting) {
        // Only forward it to the onLocation change if the frameID is type 0.

        // We need to find a better way, to not trigger on-location change for requests which are not main_document.
        HumanWeb.listener.onLocationChange.apply(HumanWeb.listener, arguments);
      }
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
    },

    contentScriptTopAds(message) {
      // console.log('>>>>> HELLO 2 >>>> ');
    },

    contentScriptHTML(message) {
      // console.log('>>>>> HELLO HTML >>>> ');
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
