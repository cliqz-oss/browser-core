/* eslint-disable no-param-reassign */

import globalConfig from '../core/config';
import moduleConfig from './config';
import telemetry from '../core/services/telemetry';
import { getDetailsFromUrl } from '../core/url';
import prefs from '../core/prefs';
import events from '../core/events';
import inject from '../core/kord/inject';
import pacemaker from '../core/services/pacemaker';
import { getMessage } from '../core/i18n';
import { isDesktopBrowser, isAMO, isGhostery } from '../core/platform';
import background from '../core/base/background';
import { getActiveTab, getWindow } from '../core/browser';
import { openLink } from '../platform/browser-actions';
import { queryTabs, getCurrentTabId } from '../core/tabs';

const TELEMETRY_TYPE = 'control_center';

function isInternalProtocol(url) {
  const internalProtocols = ['chrome', 'resource', 'moz-extension', 'chrome-extension'];
  return internalProtocols.findIndex(protocol => url.startsWith(protocol)) > -1;
}

function getAdultFilterState() {
  const data = {
    conservative: {
      name: getMessage('always'),
      selected: false
    },
    moderate: {
      name: getMessage('always_ask'),
      selected: false
    },
    liberal: {
      name: getMessage('never'),
      selected: false
    }
  };
  let state = prefs.get('adultContentFilter', 'moderate');
  if (state === 'showOnce') {
    state = 'moderate';
  }
  data[state].selected = true;

  return data;
}

class IntervalManager {
  constructor() {
    this.intervals = new Map();
  }

  add(windowId, interval) {
    this.intervals.set(windowId, interval);
  }

  has(windowId) {
    return this.intervals.has(windowId);
  }

  remove(windowId) {
    pacemaker.clearTimeout(this.intervals.get(windowId));
    this.intervals.delete(windowId);
  }

  removeAll() {
    for (const [windowId] of this.intervals) {
      this.remove(windowId);
    }
  }
}

export default background({
  core: inject.module('core'),
  antitracking: inject.module('antitracking'),
  geolocation: inject.service('geolocation', ['setLocationPermission']),

  requiresServices: ['geolocation', 'telemetry', 'pacemaker'],


  init(settings) {
    this.settings = settings;
    this.ICONS = settings.ICONS;
    this.intervals = new IntervalManager();

    // set default badge color and text
    if (chrome && chrome.browserAction2) {
      chrome.browserAction2.setBadgeBackgroundColor({ color: '#471647' });
      chrome.browserAction2.setBadgeText({ text: '0' });
    }
  },

  unload() {
    if (this.pageAction) {
      this.pageAction.shutdown();
    }
    this.intervals.removeAll();
  },

  beforeBrowserShutdown() {

  },

  refreshState(tabId) {
    this.prepareData(tabId).then((data) => {
      this.actions.setState(tabId, data.generalState);
    });
  },

  onLocationChange({ url, tabId, windowId }) {
    if (this.intervals.has(windowId)) {
      this.intervals.remove(windowId);
    }

    if (isInternalProtocol(url) && chrome && chrome.browserAction2) {
      chrome.browserAction2.setBadgeText({ text: null, tabId });
    }
    // wait for tab content to load
    if (!url
      || url === 'about:blank') {
      return;
    }

    const updateBadgeForUrl = async () => {
      if (tabId !== undefined && url) {
        try {
          const info = await this.antitracking.action('getBadgeData', { tabId, url });
          this.updateBadge(tabId, info);
        } catch (e) {
          // pass
        }
      }
    };

    this.refreshState(tabId);
    updateBadgeForUrl();
    let counter = 12;
    const interval = pacemaker.setTimeout(() => {
      updateBadgeForUrl();
      counter -= 1;
      if (counter <= 0) {
        this.intervals.remove(windowId);
      }
    }, 2000);
    this.intervals.add(windowId, interval);
  },

  updateBadge(tabId, info) {
    if (typeof chrome !== 'undefined' && chrome.browserAction2 && info !== undefined) {
      chrome.browserAction2.setBadgeText({ text: `${info}`, tabId }, () => {
        if (chrome.runtime.lastError) {
          // do nothing in case something went wrong
        }
      });
    }
  },

  prepareData(/* tabId */) {
    // TODO do I have access to the window here?
    return this.core.action(
      'getWindowStatus',
      getWindow()
    ).then((mData) => {
      const moduleData = mData;
      return this.actions.getFrameData().then((ccData) => {
        // If antitracking module is included, show critical when we get no antitracking state.
        // Otherwise show active.

        ccData.generalState = this.antitracking.isPresent()
          ? (moduleData.antitracking && moduleData.antitracking.state) || 'critical'
          : 'active';

        moduleData.adult = { visible: true, state: getAdultFilterState() };
        moduleData.humanWebOptOut = prefs.get('humanWebOptOut', false);
        moduleData.searchProxy = { enabled: prefs.get('hpn-query', false) };

        ccData.module = moduleData;

        ccData.telemetry = prefs.get('telemetry', true);
        return ccData;
      });
    });
  },

  async getCurrentTabId() {
    // its a guessing game but as it is triggered by
    // user interaction we may be right here
    // idealy we infer the current tab from action sender
    const window = getWindow();
    const tabId = await getCurrentTabId(window);
    return tabId;
  },

  events: {
    'content:location-change': function onLocationChange(...args) {
      if (!isAMO) {
        this.onLocationChange(...args);
      }
    },
    'core:tab_select': function onTabSelect(...args) {
      if (!isAMO) {
        this.onLocationChange(...args);
      }
    },
  },
  actions: {
    status() {
      return this.prepareData();
    },
    updatePref(data) {
      switch (data.pref) {
        case 'extensions.cliqz.humanWebOptOut':
          events.pub('control-center:toggleHumanWeb');
          break;
        case 'extensions.cliqz.share_location':
          this.geolocation.setLocationPermission(data.value);
          events.pub('message-center:handlers-freshtab:clear-message', {
            id: 'share-location',
            template: 'share-location'
          });
          break;
        case 'extensions.https_everywhere.globalEnabled':
          events.pub('control-center:toggleHttpsEverywhere', {
            newState: data.value
          });
          break;
        default: {
          let prefValue = data.value;
          if (data.prefType === 'boolean') {
            prefValue = (prefValue === 'true');
          }
          if (data.prefType === 'integer') {
            prefValue = parseInt(prefValue, 10);
          }
          prefs.set(data.pref, prefValue);
        }
      }

      if (!data.isPrivateMode) {
        telemetry.push({
          type: TELEMETRY_TYPE,
          target: data.target,
          state: data.value,
          action: 'click'
        });
      }
    },
    // creates the static frame data without any module details
    // re-used for fast first render and onboarding
    async getFrameData() {
      let { url } = await getActiveTab();
      let friendlyURL = url;
      let isSpecialUrl = false;
      // TODO: Switch to URL
      const urlDetails = getDetailsFromUrl(url);
      if (url.indexOf('about:') === 0) {
        friendlyURL = url;
        isSpecialUrl = true;
      } else if (url.endsWith('modules/freshtab/home.html')) {
        friendlyURL = `${moduleConfig.settings.BRAND} Tab`;
        isSpecialUrl = true;
      } else if (url.endsWith('modules/cliqz-history/index.html')) {
        friendlyURL = `${getMessage('freshtab_history_button')}`;
        isSpecialUrl = true;
      } else if (url.endsWith('modules/privacy-dashboard/index.html')) {
        friendlyURL = `${getMessage('control_center_transparency')}`;
        isSpecialUrl = true;
      } else if (url.indexOf(globalConfig.settings.ONBOARDING_URL) === 0) {
        friendlyURL = moduleConfig.settings.BRAND;
        isSpecialUrl = true;
      } else if (url.startsWith('chrome://cliqz/content/anti-phishing/phishing-warning.html')) {
        // in case this is a phishing site (and a warning is displayed),
        // we need to get the actual url instead of the warning page
        url = url.split('chrome://cliqz/content/anti-phishing/phishing-warning.html?u=')[1];
        url = decodeURIComponent(url);
        isSpecialUrl = true;
        friendlyURL = getMessage('anti-phishing-txt0');
      }

      return {
        activeURL: url,
        friendlyURL,
        isSpecialUrl,
        domain: urlDetails.domain,
        extraUrl: urlDetails.extra === '/' ? '' : urlDetails.extra,
        hostname: urlDetails.host,
        module: {}, // will be filled later
        generalState: 'active',
        feedbackURL: moduleConfig.settings.USER_SUPPORT_URL,
        locationSharingURL: 'https://cliqz.com/support/local-results',
        myoffrzURL: 'https://cliqz.com/myoffrz',
        reportSiteURL: 'https://cliqz.com/report-url',
        debug: prefs.get('showConsoleLogs', false),
        isDesktopBrowser,
        amo: isAMO,
        compactView: this.settings.id === 'ghostery@cliqz.com',
        ghostery: this.settings.id === 'ghostery@cliqz.com',
        privacyPolicyURL: globalConfig.settings.PRIVACY_POLICY_URL,
        showPoweredBy: moduleConfig.settings.SHOW_POWERED_BY,
        showLearnMore: !isGhostery
      };
    },

    async getData() {
      const tabId = await this.getCurrentTabId();

      return this.prepareData(tabId).then((data) => {
        const count = data.module.antitracking ? data.module.antitracking.badgeData : 0;
        this.updateBadge(tabId, count);
        return data;
      });
    },

    async updateState(state) {
      const tabId = await this.getCurrentTabId();

      // set the state of the current window
      this.actions.setState(tabId, state);

      // go to all the other windows and refresh the state
      const tabs = await queryTabs();
      tabs.forEach((tab) => {
        // some modules need time to start eg: antitracking
        pacemaker.setTimeout(() => {
          this.refreshState(tab.id);
        }, 3000);
      });
    },

    setState(tabId, state) {
      if (!chrome.browserAction2) {
        return;
      }

      const icon = globalConfig.baseURL + this.ICONS[state];

      chrome.browserAction2.setIcon({
        path: {
          16: icon,
          48: icon,
          128: icon
        },
        tabId
      });
      chrome.browserAction2.setBadgeBackgroundColor({ color: '#471647', tabId });
    },

    openURL(data) {
      openLink(data.url, true);

      if (!data.isPrivateMode) {
        telemetry.push({
          type: TELEMETRY_TYPE,
          target: data.target,
          action: 'click',
          index: data.index
        });
      }
    },

    sendTelemetry(data) {
      if (data.isPrivateMode) {
        return;
      }

      const signal = {
        type: TELEMETRY_TYPE,
        target: data.target,
        action: 'click'
      };
      const state = data.state;
      if (state) {
        signal.state = state;
      }
      if (data.index) {
        signal.index = data.index;
      }
      telemetry.push(signal);
    },

    'antitracking-strict': function antitrackingStrict({ isPrivateMode, status }) {
      events.pub('control-center:antitracking-strict');
      if (!isPrivateMode) {
        telemetry.push({
          type: TELEMETRY_TYPE,
          target: 'attrack_fair',
          action: 'click',
          state: status === true ? 'on' : 'off'
        });
      }
    },

    'complementary-search': function complementarySearch({ defaultSearch, isPrivateMode }) {
      events.pub('control-center:setDefault-search', defaultSearch);
      if (!isPrivateMode) {
        telemetry.push({
          type: TELEMETRY_TYPE,
          target: 'complementary_search',
          state: `search_engine_change_${defaultSearch}`,
          action: 'click'
        });
      }
    },

    'search-index-country': function searchIndexCountry({ defaultCountry, isPrivateMode }) {
      events.pub('control-center:setDefault-indexCountry', defaultCountry);
      if (!isPrivateMode) {
        telemetry.push({
          type: TELEMETRY_TYPE,
          target: 'search-index-country',
          state: `search_index_country_${defaultCountry}`,
          action: 'click',
        });
      }
    },

    'cliqz-tab': function cliqzTab({ status, isPrivateMode }) {
      events.pub('control-center:cliqz-tab');
      if (!isPrivateMode) {
        telemetry.push({
          type: TELEMETRY_TYPE,
          target: 'cliqz_tab',
          action: 'click',
          state: status === true ? 'on' : 'off'
        });
      }
    },

    'type-filter': function typeFilter(data) {
      prefs.set(`type_filter_${data.target}`, data.status);
      events.pub('type_filter:change', { target: data.target, status: data.status });
    },

    'antitracking-activator': async function antitrackingActivator(data) {
      const tabId = await this.getCurrentTabId();
      switch (data.status) {
        case 'active':
          this.core.action('enableModule', 'antitracking').then(() => {
            events.pub('antitracking:whitelist:remove', data.hostname, data.isPrivateMode);
          });
          break;
        case 'inactive':
          this.core.action('enableModule', 'antitracking').then(() => {
            events.pub('antitracking:whitelist:add', data.hostname, data.isPrivateMode);
          });
          break;
        case 'critical':
          events.pub('antitracking:whitelist:remove', data.hostname, data.isPrivateMode);
          events.nextTick(() => {
            this.core.action('disableModule', 'antitracking');
          });

          // reset the badge when the anti tracking module gets offline
          this.updateBadge(tabId, '0');
          break;
        default:
          break;
      }

      let state;
      if (data.type === 'switch') {
        state = data.state === 'active' ? 'on' : 'off';
      } else {
        state = data.state;
      }

      if (!data.isPrivateMode) {
        telemetry.push({
          type: TELEMETRY_TYPE,
          target: `attrack_${data.type}`,
          state,
          action: 'click',
        });
      }
    },

    'anti-phishing-activator': function antiphishingActivator(data) {
      inject.module('anti-phishing').action('activator', data.state, data.url);

      let state;
      if (data.type === 'switch') {
        state = data.state === 'active' ? 'on' : 'off';
      } else {
        state = data.state;
      }

      if (!data.isPrivateMode) {
        telemetry.push({
          type: TELEMETRY_TYPE,
          target: `antiphishing_${data.type}`,
          state,
          action: 'click',
        });
      }
    },

    'adb-activator': function adbActivator(data) {
      events.pub('control-center:adb-activator', data);
      let state;
      if (data.type === 'switch') {
        state = data.state === 'active' ? 'on' : 'off';
      } else {
        state = data.state;
      }

      if (!data.isPrivateMode) {
        telemetry.push({
          type: TELEMETRY_TYPE,
          target: `adblock_${data.type}`,
          state,
          action: 'click',
        });
      }
    },

    'antitracking-clearcache': function antitrackingClearCache({ isPrivateMode }) {
      events.pub('control-center:antitracking-clearcache', isPrivateMode);
    },

    'adb-optimized': function adbOptimized(data) {
      events.pub('control-center:adb-optimized', data.status);

      if (!data.isPrivateMode) {
        telemetry.push({
          type: TELEMETRY_TYPE,
          target: 'adblock_fair',
          action: 'click',
          state: data.status === true ? 'on' : 'off'
        });
      }
    },

    'quick-search-state': function quickSearchState(data) {
      prefs.set('modules.search.providers.cliqz.enabled', data.enabled);
      // TODO telemetry
      return this.actions.getData();
    }
  },
});
