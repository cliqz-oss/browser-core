/* eslint no-param-reassign: 'off' */
/* eslint func-names: 'off' */

import background from '../core/base/background';
import telemetryService from '../core/services/telemetry';
import Attrack from './attrack';
import { DEFAULT_ACTION_PREF, updateDefaultTrackerTxtRule } from './tracker-txt';
import prefs from '../core/prefs';
import telemetry from './telemetry';
import Config, { TELEMETRY } from './config';
import { updateTimestamp } from './time';
import domainInfo from '../core/services/domain-info';
import { bindObjectFunctions } from '../core/helpers/bind-functions';
import inject from '../core/kord/inject';
import { isMobile, isEdge } from '../core/platform';

function humanwebExistsAndDisabled() {
  const humanweb = inject.module('human-web');
  return humanweb.isPresent() && !humanweb.isEnabled();
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

    if (isMobile) {
      prefs.set('attrackBloomFilter', false);
    }

    this.attrack = new Attrack();

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
    if (isEdge) {
      this.config.databaseEnabled = false;
    }
    return this.config.init().then(() => {
      // check HW status (for telemetry)
      // - On Cliqz humanweb opt-out is flagged via 'humanWebOptOut' pref.
      // - On Ghostery the module is disabled
      // - On other platforms, where humanweb is not in the build, opt-out should be done directly.
      if (prefs.get('humanWebOptOut', false) || humanwebExistsAndDisabled()) {
        this.config.telemetryMode = TELEMETRY.DISABLED;
      }
      return this.attrack.init(this.config, settings);
    });
  },

  /**
  * @method unload
  */
  unload() {
    if (this.attrack !== null) {
      this.attrack.unload();
      this.attrack = null;
    }

    this.enabled = false;
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
    getBadgeData({ tabId, url }) {
      return this.attrack.getTabBlockingInfo(tabId, url).then((info) => {
        if (this.attrack.urlWhitelist.isWhitelisted(url)) {
          // do not display number if site is whitelisted
          return 0;
        }
        return info.cookies.blocked + info.requests.unsafe;
      });
    },
    getCurrentTabBlockingInfo() {
      return this.attrack.getCurrentTabBlockingInfo();
    },
    addPipelineStep(stage, opts) {
      if (!this.attrack.pipelines || !this.attrack.pipelines[stage]) {
        return Promise.reject(new Error(`Could not add pipeline step: ${stage}, ${opts.name}`));
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
      if (!this.attrack.tp_events._active[tabId]
          || !this.attrack.tp_events._active[tabId].annotations
          || !this.attrack.tp_events._active[tabId].annotations.counter) {
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

    setWhiteListCheck(fn) {
      this.attrack.isWhitelisted = fn;
    }
  },

  popupActions: {
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
      telemetryService.push(msg);
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

  events: {
    prefchange: function onPrefChange(pref) {
      if (pref === DEFAULT_ACTION_PREF) {
        updateDefaultTrackerTxtRule();
      } else if (pref === 'config_ts') {
        // update date timestamp set in humanweb
        updateTimestamp(prefs.get('config_ts', null));
      } else if (pref === 'humanWebOptOut') {
        if (prefs.get('humanWebOptOut', false)) {
          this.attrack.setHWTelemetryMode(false);
        } else {
          this.attrack.setHWTelemetryMode(true);
        }
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
    'antitracking:whitelist:add': function (hostname, isPrivateMode) {
      this.attrack.urlWhitelist.changeState(hostname, 'hostname', 'add');
      this.attrack.logWhitelist(hostname);
      if (!isPrivateMode) {
        this.popupActions.telemetry({
          action: 'click',
          target: 'whitelist_domain'
        });
      }
    },
    'antitracking:whitelist:remove': function (hostname, isPrivateMode) {
      this.attrack.urlWhitelist.changeState(hostname, 'hostname', 'remove');
      if (!isPrivateMode) {
        this.popupActions.telemetry({
          action: 'click',
          target: 'unwhitelist_domain'
        });
      }
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
    'control-center:antitracking-clearcache': function (isPrivateMode) {
      this.attrack.clearCache();
      if (!isPrivateMode) {
        this.popupActions.telemetry({
          action: 'click',
          target: 'clearcache',
        });
      }
    },
  },
});
