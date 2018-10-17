/* eslint no-param-reassign: 'off' */
/* eslint func-names: 'off' */

import background from '../core/base/background';
import * as browser from '../platform/browser';
import Attrack from './attrack';
import { DEFAULT_ACTION_PREF, updateDefaultTrackerTxtRule } from './tracker-txt';
import utils from '../core/utils';
import prefs from '../core/prefs';
import telemetry from './telemetry';
import Config, { MIN_BROWSER_VERSION } from './config';
import { updateTimestamp } from './time';
import domainInfo from '../core/services/domain-info';
import bindObjectFunctions from '../core/helpers/bind-functions';
import inject from '../core/kord/inject';

function onLocationChange({ url, tabId }) {
  if (this.interval) { clearInterval(this.interval); }
  let counter = 12;

  this.updateBadge({ tabId, url });

  this.interval = setInterval(() => {
    this.updateBadge({ tabId, url });

    counter -= 1;
    if (counter <= 0) {
      clearInterval(this.interval);
    }
  }, 2000);
}

/**
* @namespace antitracking
* @class Background
*/
export default background({
  // Injected in window.es
  controlCenter: inject.module('control-center'),

  requiresServices: ['cliqz-config', 'domainInfo', 'pacemaker'],

  /**
  * @method init
  * @param settings
  */
  init(settings) {
    // Create new attrack class
    this.settings = settings;
    this.core = inject.module('core');
    this.attrack = new Attrack();

    if (browser.getBrowserMajorVersion() < MIN_BROWSER_VERSION) {
      return Promise.resolve();
    }

    // fix for users without pref properly set: set to value from build config
    if (!prefs.has('attrackRemoveQueryStringTracking')) {
      prefs.set('attrackRemoveQueryStringTracking', true);
    }

    // indicates if the antitracking background is initiated
    this.enabled = true;
    this.clickCache = {};

    bindObjectFunctions(this.popupActions, this);

    // inject configured telemetry module
    // do not initiate if disabled from config
    if (!settings.DISABLE_ATTRACK_TELEMETRY) {
      telemetry.loadFromProvider(settings.ATTRACK_TELEMETRY_PROVIDER || 'human-web', settings.HW_CHANNEL);
    }


    // load config
    this.config = new Config({}, () => this.core.action('refreshAppState'));
    return this.config.init().then(() => this.attrack.init(this.config));
  },

  /**
  * @method unload
  */
  unload() {
    if (browser.getBrowserMajorVersion() < MIN_BROWSER_VERSION) {
      this.enabled = false;
      return;
    }

    if (this.attrack !== null) {
      this.attrack.unload();
      this.attrack = null;
    }

    this.enabled = false;
    clearInterval(this.interval);
  },

  /**
   * State which will be passed to the content-script
   */
  getState() {
    return {
      cookieBlockingEnabled: this.config.cookieEnabled,
      compatibilityList: this.config.compatibilityList,
    };
  },

  actions: {
    getCurrentTabBlockingInfo() {
      return this.attrack.getCurrentTabBlockingInfo();
    },
    addPipelineStep(stage, opts) {
      if (!this.attrack.pipelines || !this.attrack.pipelines[stage]) {
        return Promise.reject(`Could not add pipeline step: ${stage}, ${opts.name}`);
      }

      return this.attrack.pipelines[stage].addPipelineStep(opts);
    },
    removePipelineStep(stage, name) {
      if (this.attrack && this.attrack.pipelines && this.attrack.pipelines[stage]) {
        this.attrack.pipelines[stage].removePipelineStep(name);
      }
    },
    telemetry(opts) {
      return this.attrack.telemetry(opts);
    },
    getWhitelist() {
      return this.attrack.qs_whitelist;
    },
    getTabTracker() {
      return this.attrack.tp_events;
    },
    getTrackerListForTab(tab) {
      return this.attrack.getTrackerListForTab(tab);
    },
    aggregatedBlockingStats(tabId) {
      return this.attrack.getAppsForTab(tabId).then((info) => {
        const stats = {};

        Object.keys(info.known || {}).forEach((appId) => {
          const company = domainInfo.getAppOwner(appId);
          if (!company) {
            return;
          }
          if (!stats[company.cat]) {
            stats[company.cat] = {};
          }
          stats[company.cat][company.name] = info.known[appId];
        });

        Object.keys(info.unknown).forEach((tld) => {
          if (!stats.unknown) {
            stats.unknown = {};
          }
          stats.unknown[tld] = info.unknown[tld];
        });

        return stats;
      });
    },
    getGhosteryStats(tabId) {
      if (!this.attrack.tp_events._active[tabId] ||
          !this.attrack.tp_events._active[tabId].annotations ||
          !this.attrack.tp_events._active[tabId].annotations.counter) {
        return {
          bugs: {},
          others: {},
        };
      }
      return this.attrack.tp_events._active[tabId].annotations.counter.getSummary();
    },
    isEnabled() {
      return this.enabled;
    },
    disable() {
      this.unload();
    },
    enable() {
      this.init(this.settings);
    },

    isWhitelisted(url) {
      return this.attrack.urlWhitelist.isWhitelisted(url);
    },

    changeWhitelistState(url, type, action) {
      return this.attrack.urlWhitelist.changeState(url, type, action);
    },

    getWhitelistState(url) {
      return this.attrack.urlWhitelist.getState(url);
    },

    // legacy api for mobile
    isSourceWhitelisted(domain) {
      return this.actions.isWhitelisted(domain);
    },

    addSourceDomainToWhitelist(domain) {
      return this.actions.changeWhitelistState(domain, 'hostname', 'add');
    },

    removeSourceDomainFromWhitelist(domain) {
      return this.actions.changeWhitelistState(domain, 'hostname', 'remove');
    },

    setConfigOption(prefName, value) {
      this.config.setPref(prefName, value);
    },

    pause() {
      this.config.paused = true;
    },

    resume() {
      this.config.paused = false;
    },
  },

  popupActions: {
    /**
    * @method popupActions.toggleAttrack
    * @param args
    * @param cb Callback
    */
    toggleAttrack(args, cb) {
      const currentState = prefs.get('modules.antitracking.enabled', true);

      if (currentState) {
        this.attrack.disableModule();
      } else {
        this.attrack.enableModule();
      }

      cb();

      this.popupActions.telemetry({ action: 'click', target: (currentState ? 'deactivate' : 'activate') });
    },
    /**
    * @method popupActions.closePopup
    */
    closePopup(_, cb) {
      cb();
    },
    /**
    * @method popupActions.toggleWhiteList
    * @param args
    * @param cb Callback
    */
    toggleWhiteList(args, cb) {
      const hostname = args.hostname;
      if (this.attrack.urlWhitelist.isWhitelisted(hostname)) {
        this.popupActions.telemetry({ action: 'click', target: 'unwhitelist_domain' });
      } else {
        this.popupActions.telemetry({ action: 'click', target: 'whitelist_domain' });
      }
      this.attrack.urlWhitelist.changeState(hostname, 'hostname', 'toggle');
      cb();
    },

    _isDuplicate(info) {
      const now = Date.now();
      const key = info.tab + info.hostname + info.path;

      // clean old entries
      for (const k of Object.keys(this.clickCache)) {
        if (now - this.clickCache[k] > 60000) {
          delete this.clickCache[k];
        }
      }

      if (key in this.clickCache) {
        return true;
      }
      this.clickCache[key] = now;
      return false;
    },

    telemetry(msg) {
      if (msg.includeUnsafeCount) {
        delete msg.includeUnsafeCount;
        const info = this.attrack.getCurrentTabBlockingInfo();
        // drop duplicated messages
        if (info.error || this.popupActions._isDuplicate(info)) {
          return;
        }
        msg.unsafe_count = info.cookies.blocked + info.requests.unsafe;
        msg.special = info.error !== undefined;
      }
      msg.type = 'antitracking';
      utils.telemetry(msg);
    }
  },

  status() {
    const enabled = prefs.get('modules.antitracking.enabled', true);
    return {
      visible: true,
      strict: prefs.get('attrackForceBlock', false),
      state: enabled ? 'active' : 'critical',
      totalCount: 0,
    };
  },

  updateBadge({ tabId, url }) {
    this.attrack.getTabBlockingInfo(tabId, url).then((info) => {
      this.controlCenter.action(
        'updateBadge',
        tabId,
        this.getBadgeData(info),
      );
    });
  },

  getBadgeData(info) {
    if (this.attrack.urlWhitelist.isWhitelisted(info.hostname)) {
      // do not display number if site is whitelisted
      return 0;
    }
    return info.cookies.blocked + info.requests.unsafe;
  },

  events: {
    prefchange: function onPrefChange(pref) {
      if (pref === DEFAULT_ACTION_PREF) {
        updateDefaultTrackerTxtRule();
      } else if (pref === 'config_ts') {
        // update date timestamp set in humanweb
        updateTimestamp(prefs.get('config_ts', null));
      }
      this.config.onPrefChange(pref);
    },
    'content:dom-ready': function onDomReady(url) {
      const domChecker = this.attrack.pipelineSteps.domChecker;

      if (!domChecker) {
        return;
      }

      domChecker.loadedTabs[url] = true;
      domChecker.recordLinksForURL(url);
      domChecker.clearDomLinks();
    },
    'antitracking:whitelist:add': function (hostname, isPrivate) {
      this.attrack.urlWhitelist.changeState(hostname, 'hostname', 'add');
      this.attrack.logWhitelist(hostname);
      if (!isPrivate) {
        this.popupActions.telemetry({
          action: 'click',
          target: 'whitelist_domain'
        });
      }
    },
    'antitracking:whitelist:remove': function (hostname) {
      this.attrack.urlWhitelist.changeState(hostname, 'hostname', 'remove');
      this.popupActions.telemetry({
        action: 'click',
        target: 'unwhitelist_domain'
      });
    },
    'control-center:antitracking-strict': () => {
      prefs.set('attrackForceBlock', !prefs.get('attrackForceBlock', false));
    },
    'core:mouse-down': function (...args) {
      if (this.attrack.pipelineSteps.cookieContext) {
        this.attrack.pipelineSteps.cookieContext.setContextFromEvent
          .call(this.attrack.pipelineSteps.cookieContext, ...args);
      }
    },
    'control-center:antitracking-clearcache': function () {
      this.attrack.clearCache();
      this.popupActions.telemetry({
        action: 'click',
        target: 'clearcache',
      });
    },
    'content:location-change': onLocationChange,
    'core:tab_select': onLocationChange,
  },
});
