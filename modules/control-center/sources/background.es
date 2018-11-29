/* eslint-disable no-param-reassign */

import ToolbarButton from '../core/ui/toolbar-button';
import globalConfig from '../core/config';
import moduleConfig from './config';
import utils from '../core/utils';
import { getDetailsFromUrl } from '../core/url';
import prefs from '../core/prefs';
import events from '../core/events';
import inject from '../core/kord/inject';
import { getMessage } from '../core/i18n';
import { isBootstrap, isDesktopBrowser, isAMO, isGhostery, isMobile, getResourceUrl } from '../core/platform';
import background from '../core/base/background';
import { getThemeStyle, getActiveTab } from '../platform/browser';
import { openLink } from '../platform/browser-actions';
import { queryTabs, getCurrentTabId } from '../core/tabs';

const DD_HEIGHT = {
  '04': () => 413, // amo
  40: () => 496, // Q browser
};

const TELEMETRY_TYPE = 'control_center';

function getBrowserActionIcon() {
  const icons = globalConfig.settings.PAGE_ACTION_ICONS;
  return globalConfig.baseURL + (icons[getThemeStyle()] || icons.default);
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
    const interval = this.intervals.get(windowId);
    clearInterval(interval);
    this.intervals.delete(windowId);
  }

  removeAll() {
    for (const [windowId] of this.intervals) {
      this.remove(windowId);
    }
  }
}

export default background({
  // injecting ourselfs to get access to windowModule on webextensions
  core: inject.module('core'),
  antitracking: inject.module('antitracking'),
  geolocation: inject.module('geolocation'),


  init(settings) {
    this.settings = settings;
    this.ICONS = settings.ICONS;
    this.BACKGROUNDS = settings.BACKGROUNDS;
    this.intervals = new IntervalManager();

    if (settings.disableControlCenterButton) {
      return;
    }

    if (isBootstrap) {
      if (this.settings.id !== 'ghostery@cliqz.com') {
        this.toolbarButton = new ToolbarButton({
          widgetId: 'control-center',
          default_title: getMessage('control_center_icon_tooltip'),
          default_popup: `${globalConfig.baseURL}control-center/index.html`,
          default_icon: () => `${globalConfig.baseURL}${settings.ICONS.active[getThemeStyle()]}`,
          badgeBackgroundColor: '#471647',
          badgeText: '0',
          defaultHeight: DD_HEIGHT[this.settings.channel] || (() => 246)
        });
        this.toolbarButton.build();
      } else {
        this.pageAction = new ToolbarButton({
          widgetId: 'cc-page-action',
          default_title: getMessage('control_center_icon_tooltip'),
          default_popup: `${globalConfig.baseURL}control-center/index.html`,
          default_icon: getBrowserActionIcon,
          defaultHeight: () => 251
        }, true);
        this.pageAction.build();
      }
    } else if (!isMobile && !isAMO) {
      this.toolbarButton = new ToolbarButton({
        default_title: getMessage('control_center_icon_tooltip'),
        default_popup: `${globalConfig.baseURL}control-center/index.html`
      }, true);
      this.toolbarButton.build();
    }

    // TODO: @chrmod, it looks like it was doing nothing as at this point of time
    // there may be no tabs
    // setTimeout(this.actions.setState.bind(this), 0, 'active');
  },

  unload() {
    if (this.toolbarButton) {
      this.toolbarButton.shutdown();
    }

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

    this.updateBadge(tabId, '0');
    // wait for tab content to load
    if (!url
      || url === 'about:blank'
      || url.startsWith(getResourceUrl(''))) {
      return;
    }

    const updateBadgeForUrl = async () => {
      if (tabId && url) {
        const info = await this.antitracking.action('getBadgeData', { tabId, url });
        this.updateBadge(tabId, info);
      }
    };

    this.refreshState(tabId);
    updateBadgeForUrl();
    let counter = 12;
    const interval = setInterval(() => {
      updateBadgeForUrl();
      counter -= 1;
      if (counter <= 0) {
        this.intervals.remove(windowId);
      }
    }, 2000);
    this.intervals.add(windowId, interval);
  },

  updateBadge(tabId, info) {
    if (this.toolbarButton && info !== undefined) {
      this.toolbarButton.setBadgeText(tabId, `${info}`);
    }
  },

  prepareData(/* tabId */) {
    // TODO do I have access to the window here?
    return this.core.action(
      'getWindowStatus',
      utils.getWindow()
    ).then((mData) => {
      const moduleData = mData;
      return this.actions.getFrameData().then((ccData) => {
        // If antitracking module is included, show critical when we get no antitracking state.
        // Otherwise show active.

        ccData.generalState = this.antitracking.isPresent()
          ? (moduleData.antitracking && moduleData.antitracking.state) || 'critical'
          : 'active';

        moduleData.adult = { visible: true, state: getAdultFilterState() };
        if (prefs.has('browser.privatebrowsing.apt', '') && this.settings.channel === '40') {
          moduleData.apt = { visible: true, state: prefs.get('browser.privatebrowsing.apt', false, '') };
        }

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
    const window = utils.getWindow();
    const tabId = await getCurrentTabId(window);
    return tabId;
  },

  events: {
    hostthemechange: async function onThemeChange() {
      const tabs = await queryTabs();
      tabs.forEach((tab) => {
        this.refreshState(tab.id);
        if (this.pageAction) {
          this.pageAction.setIcon(tab.id, getBrowserActionIcon());
        }
      });
    },
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
          this.geolocation.action(
            'setLocationPermission',
            data.value
          );
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
          prefs.set(data.pref, prefValue, '' /* full pref name required! */);
        }
      }
      utils.telemetry({
        type: TELEMETRY_TYPE,
        target: data.target,
        state: data.value,
        action: 'click'
      });
    },
    // creates the static frame data without any module details
    // re-used for fast first render and onboarding
    async getFrameData() {
      let { url } = await getActiveTab();
      let friendlyURL = url;
      let isSpecialUrl = false;
      let urlDetails = getDetailsFromUrl(url);
      if (url.indexOf('about:') === 0) {
        friendlyURL = url;
        isSpecialUrl = true;
      } else if (url.indexOf(globalConfig.settings.NEW_TAB_URL) === 0) {
        friendlyURL = `${moduleConfig.settings.BRAND} Tab`;
        isSpecialUrl = true;
      } else if (url.indexOf(globalConfig.settings.ONBOARDING_URL) === 0) {
        friendlyURL = moduleConfig.settings.BRAND;
        isSpecialUrl = true;
      } else if (url.startsWith('chrome://cliqz/content/anti-phishing/phishing-warning.html')) {
        // in case this is a phishing site (and a warning is displayed),
        // we need to get the actual url instead of the warning page
        url = url.split('chrome://cliqz/content/anti-phishing/phishing-warning.html?u=')[1];
        url = decodeURIComponent(url);
        urlDetails = getDetailsFromUrl(url);
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
        setTimeout(() => {
          this.refreshState(tab.id);
        }, 3000);
      });
    },

    setState(tabId, state) {
      if (!this.toolbarButton) {
        return;
      }

      const icon = globalConfig.baseURL + (
        this.ICONS[state][getThemeStyle()]
        || this.ICONS[state].default
      );

      this.toolbarButton.setIcon(tabId, icon);
      this.toolbarButton.setBadgeBackgroundColor(tabId, this.BACKGROUNDS[state]);
    },

    openURL(data) {
      const win = utils.getWindow();

      switch (data.url) {
        case 'history': {
          // use firefox command to ensure compatibility
          win.document.getElementById('Browser:ShowAllHistory').click();
          break;
        }
        case 'forget_history': {
          // use firefox command to ensure compatibility
          win.document.getElementById('Tools:Sanitize').click();
          break;
        }
        default: {
          openLink(data.url, true);
        }
      }

      utils.telemetry({
        type: TELEMETRY_TYPE,
        target: data.target,
        action: 'click',
        index: data.index
      });
    },

    sendTelemetry(data) {
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
      utils.telemetry(signal);
    },

    'antitracking-strict': function antitrackingStrict(data) {
      events.pub('control-center:antitracking-strict');
      utils.telemetry({
        type: TELEMETRY_TYPE,
        target: 'attrack_fair',
        action: 'click',
        state: data.status === true ? 'on' : 'off'
      });
    },

    'complementary-search': function complementarySearch(data) {
      events.pub('control-center:setDefault-search', data.defaultSearch);
      utils.telemetry({
        type: TELEMETRY_TYPE,
        target: 'complementary_search',
        state: `search_engine_change_${data.defaultSearch}`,
        action: 'click'
      });
    },

    'search-index-country': function searchIndexCountry(data) {
      events.pub('control-center:setDefault-indexCountry', data.defaultCountry);
      utils.telemetry({
        type: TELEMETRY_TYPE,
        target: 'search-index-country',
        state: `search_index_country_${data.defaultCountry}`,
        action: 'click',
      });
    },

    'cliqz-tab': function cliqzTab(data) {
      events.pub('control-center:cliqz-tab');
      utils.telemetry({
        type: TELEMETRY_TYPE,
        target: 'cliqz_tab',
        action: 'click',
        state: data.status === true ? 'on' : 'off'
      });
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
            events.pub('antitracking:whitelist:remove', data.hostname);
          });
          break;
        case 'inactive':
          this.core.action('enableModule', 'antitracking').then(() => {
            events.pub('antitracking:whitelist:add', data.hostname, utils.isPrivateMode(this.window));
          });
          break;
        case 'critical':
          events.pub('antitracking:whitelist:remove', data.hostname);
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

      utils.telemetry({
        type: TELEMETRY_TYPE,
        target: `attrack_${data.type}`,
        state,
        action: 'click',
      });
    },

    'anti-phishing-activator': function antiphishingActivator(data) {
      const ph = inject.module('anti-phishing');
      ph.action('activator', data.state, data.url);

      let state;
      if (data.type === 'switch') {
        state = data.state === 'active' ? 'on' : 'off';
      } else {
        state = data.state;
      }
      utils.telemetry({
        type: TELEMETRY_TYPE,
        target: `antiphishing_${data.type}`,
        state,
        action: 'click',
      });
    },

    'adb-activator': function adbActivator(data) {
      events.pub('control-center:adb-activator', data);
      let state;
      if (data.type === 'switch') {
        state = data.state === 'active' ? 'on' : 'off';
      } else {
        state = data.state;
      }
      utils.telemetry({
        type: TELEMETRY_TYPE,
        target: `adblock_${data.type}`,
        state,
        action: 'click',
      });
    },

    'antitracking-clearcache': function antitrackingClearCache() {
      events.pub('control-center:antitracking-clearcache');
    },

    'adb-optimized': function adbOptimized(data) {
      events.pub('control-center:adb-optimized');
      utils.telemetry({
        type: TELEMETRY_TYPE,
        target: 'adblock_fair',
        action: 'click',
        state: data.status === true ? 'on' : 'off'
      });
    },

    'quick-search-state': function quickSearchState(data) {
      prefs.set('modules.search.providers.cliqz.enabled', data.enabled);
      // TODO telemetry
      return this.actions.getData();
    }
  },
});
