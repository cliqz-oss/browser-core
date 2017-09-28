import background from '../core/base/background';
import * as browser from '../platform/browser';
import Attrack from './attrack';
import { DEFAULT_ACTION_PREF, updateDefaultTrackerTxtRule } from './tracker-txt';
import { utils } from '../core/cliqz';
import telemetry from './telemetry';
import Config, { MIN_BROWSER_VERSION } from './config';
import { updateTimestamp } from './time';
import { getAppOwner } from '../core/domain-info';

/**
* @namespace antitracking
* @class Background
*/
export default background({
  // Injected in window.es
  // controlCenter: inject.module('control-center'),

  /**
  * @method init
  * @param settings
  */
  init(settings) {
    // Create new attrack class
    this.settings = settings;
    this.attrack = new Attrack();

    if (browser.getBrowserMajorVersion() < MIN_BROWSER_VERSION) {
      return Promise.resolve();
    }

    // fix for users without pref properly set: set to value from build config
    if (!utils.hasPref('attrackRemoveQueryStringTracking')) {
      utils.setPref('attrackRemoveQueryStringTracking', true);
    }

    // indicates if the antitracking background is initiated
    this.enabled = true;
    this.clickCache = {};

    utils.bindObjectFunctions(this.popupActions, this);

    // inject configured telemetry module
    telemetry.loadFromProvider(settings.AT_TELEMETRY_PROVIDER || 'human-web', settings.HW_CHANNEL);

    // load config
    this.config = new Config({});
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
    isSourceWhitelisted(domain) {
      return this.attrack.isSourceWhitelisted(domain);
    },
    addSourceDomainToWhitelist(domain) {
      return this.attrack.addSourceDomainToWhitelist(domain);
    },
    removeSourceDomainFromWhitelist(domain) {
      return this.attrack.removeSourceDomainFromWhitelist(domain);
    },
    getTrackerListForTab(tab) {
      return this.attrack.getTrackerListForTab(tab);
    },
    aggregatedBlockingStats(tabId) {
      return this.attrack.getAppsForTab(tabId).then((info) => {
        const stats = {};

        Object.keys(info.known || {}).forEach((appId) => {
          const company = getAppOwner(appId);
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
    isEnabled() {
      return this.enabled;
    },
    disable() {
      this.unload();
    },
    enable() {
      this.init(this.settings);
    }
  },

  popupActions: {
    /**
    * @method popupActions.toggleAttrack
    * @param args
    * @param cb Callback
    */
    toggleAttrack(args, cb) {
      var currentState = utils.getPref('modules.antitracking.enabled', true);

      if (currentState) {
        this.attrack.disableModule();
      } else {
        this.attrack.enableModule();
      }

      cb();

      this.popupActions.telemetry( {action: 'click', 'target': (currentState ? 'deactivate' : 'activate')} )
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
      var hostname = args.hostname;
      if (this.attrack.isSourceWhitelisted(hostname)) {
        this.attrack.removeSourceDomainFromWhitelist(hostname);
        this.popupActions.telemetry( { action: 'click', target: 'unwhitelist_domain'} );
      } else {
        this.attrack.addSourceDomainToWhitelist(hostname);
        this.popupActions.telemetry( { action: 'click', target: 'whitelist_domain'} );
      }
      cb();
    },

    _isDuplicate(info) {
      const now = Date.now();
      const key = info.tab + info.hostname + info.path;

      // clean old entries
      for (let k of Object.keys(this.clickCache)) {
        if (now - this.clickCache[k] > 60000) {
          delete this.clickCache[k];
        }
      }

      if (key in this.clickCache) {
        return true;
      } else {
        this.clickCache[key] = now;
        return false;
      }
    },

    telemetry(msg) {
      if (msg.includeUnsafeCount) {
        delete msg.includeUnsafeCount
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

  events: {
    "prefchange": function onPrefChange(pref) {
      if (pref === DEFAULT_ACTION_PREF) {
        updateDefaultTrackerTxtRule();
      } else if (pref === 'config_ts') {
        // update date timestamp set in humanweb
        updateTimestamp(utils.getPref('config_ts', null));
      }
      this.config.onPrefChange(pref);
    },
    "content:dom-ready": function onDomReady(url) {
      const domChecker = this.attrack.pipelineSteps.domChecker;

      if (!domChecker) {
        return;
      }

      domChecker.loadedTabs[url] = true;
      domChecker.recordLinksForURL(url);
      domChecker.clearDomLinks();
    },
    "antitracking:whitelist:add": function (hostname) {
      this.attrack.addSourceDomainToWhitelist(hostname);
      this.popupActions.telemetry({
        action: 'click',
        target: 'whitelist_domain'
      });
    },
    "antitracking:whitelist:remove": function (hostname) {
      if (this.attrack.isSourceWhitelisted(hostname)){
        this.attrack.removeSourceDomainFromWhitelist(hostname);
        this.popupActions.telemetry({
          action: 'click',
          target: 'unwhitelist_domain'
        });
      }
    },
    "control-center:antitracking-strict": function () {
      utils.setPref('attrackForceBlock', !utils.getPref('attrackForceBlock', false));
    },
    "core:mouse-down": function() {
      if (this.attrack.pipelineSteps.cookieContext) {
        this.attrack.pipelineSteps.cookieContext.setContextFromEvent.apply(this.attrack.pipelineSteps.cookieContext, arguments);
      }
    },
    "control-center:antitracking-clearcache": function() {
      this.attrack.clearCache();
      this.popupActions.telemetry({
        action: 'click',
        target: 'clearcache',
      });
    },
  },
});
