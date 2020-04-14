/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint no-param-reassign: 'off' */
/* eslint func-names: 'off' */

import { browser } from '../platform/globals';
import inject from '../core/kord/inject';
import telemetry from '../core/services/telemetry';
import config from './config';
import { getWallpapers, getDefaultWallpaper } from './wallpapers';
import openImportDialog from '../platform/freshtab/browser-import-dialog';
import SpeedDials from './speed-dials';
import getDexie from '../platform/lib/dexie';
import background from '../core/base/background';
import { queryTabs, reloadTab, getTabsWithUrl } from '../core/tabs';
import {
  getResourceUrl,
  isAMO,
  isCliqzBrowser,
  isChromium,
  product,
} from '../core/platform';
import prefs from '../core/prefs';
import i18n, { getLanguageFromLocale, getMessage } from '../core/i18n';
import HistoryService from '../platform/history-service';
import HistoryManager from '../core/history-manager';
import extChannel from '../platform/ext-messaging';
import { isBetaVersion } from '../platform/platform';
import moment from '../platform/lib/moment';
import formatTime from './utils';
import console from '../core/console';

// Telemetry for freshtab
import metrics from './telemetry/metrics';
import newsPaginationAnalysis from './telemetry/analyses/news/pagination';
import newsSnippetsAnalysis from './telemetry/analyses/news/snippets';
import genericInteractionsAnalysis from './telemetry/analyses/generic/interactions';

const FRESHTAB_CONFIG_PREF = 'freshtabConfig';
const DEVELOPER_FLAG_PREF = 'developer';
const FRESHTAB_AUTOFOCUS_PREF = 'freshtab.search.autofocus';
const DISMISSED_ALERTS = 'dismissedAlerts';
const CUSTOM_BG_PREF = 'modules.freshtab.customBackground';

const COMPONENT_STATE_VISIBLE = {
  visible: true,
};

const COMPONENT_STATE_INVISIBLE = {
  visible: false,
};

const NEW_TAB_URL = isChromium ? 'chrome://newtab/' : getResourceUrl(config.settings.NEW_TAB_URL);
const NEW_TAB_REDIRECTED_URL = `${getResourceUrl(config.settings.NEW_TAB_URL)}#ntp`;
const HISTORY_URL = getResourceUrl(config.settings.HISTORY_URL);

const freshtabUrls = [
  NEW_TAB_URL,
  NEW_TAB_REDIRECTED_URL,
];
const historyWhitelist = [
  ...freshtabUrls,
  HISTORY_URL
];

if (config.settings.frameScriptWhitelist) {
  historyWhitelist.push(...config.settings.frameScriptWhitelist);
}

function isHistoryDependentPage(url) {
  return historyWhitelist.some(u => url.indexOf(u) === 0);
}

const createBlueThemeManager = (hostPrefs) => {
  const pref = 'extensions.cliqz.freshtab.blueTheme.enabled';
  return {
    enable() {
      return hostPrefs.set(pref, true);
    },
    disable() {
      return hostPrefs.set(pref, false);
    },
    isEnabled() {
      return hostPrefs.get(pref);
    },
  };
};

/**
 * @module freshtab
 * @namespace freshtab
 * @class Background
 */
export default background({
  // Modules dependencies
  core: inject.module('core'),
  search: inject.module('search'),
  ui: inject.module('ui'),
  insights: inject.module('insights'),
  history: inject.module('history'),
  news: inject.module('news'),

  // Services dependencies
  geolocation: inject.service('geolocation', ['setLocationPermission']),
  hostSettings: inject.service('host-settings', ['get', 'set']),

  requiresServices: [
    'geolocation',
    'pacemaker',
    'session',
    'telemetry',
    'host-settings',
  ],
  telemetrySchemas: [
    ...metrics,
    newsPaginationAnalysis,
    newsSnippetsAnalysis,
    genericInteractionsAnalysis,
  ],

  /**
  * @method init
  */
  async init(settings) {
    telemetry.register(this.telemetrySchemas);

    if (this.isCustomBackgroundSupported) {
      const Dexie = await getDexie();
      this.db = new Dexie('freshtab');
      this.db.version(1).stores({
        wallpapers: 'id'
      });

      await this.db.open().catch((e) => {
        console.error('Could not open freshtab database: ', e);
      });
    }

    this.settings = settings;
    this.messages = {};
    this.onVisitRemoved = this._onVisitRemoved.bind(this);
    this.onSpeedDialsChanged = this._onSpeedDialsChanged.bind(this);
    this.onThemeChanged = this._onThemeChanged.bind(this);
    this.blueThemeManager = createBlueThemeManager(this.hostSettings);

    HistoryService.onVisitRemoved.addListener(this.onVisitRemoved);
    SpeedDials.onChanged.addListener(this.onSpeedDialsChanged);
    if (browser.cliqz) {
      browser.cliqz.onPrefChange.addListener(this.onThemeChanged, 'extensions.', 'activeThemeID');
    }
  },
  /**
  * @method unload
  */
  unload() {
    telemetry.unregister(this.telemetrySchemas);
    HistoryService.onVisitRemoved.removeListener(this.onVisitRemoved);
    SpeedDials.onChanged.removeListener(this.onSpeedDialsChanged);
    if (browser.cliqz) {
      browser.cliqz.onPrefChange.removeListener(this.onThemeChanged);
    }
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  },

  status() {
    return {
      autofocus: prefs.get(FRESHTAB_AUTOFOCUS_PREF, false),
      visible: true,
      enabled: true,
    };
  },

  async _onThemeChanged() {
    const theme = await this.browserTheme();
    this._callFreshtabAction('updateBrowserTheme', theme);
  },

  _callFreshtabAction(action, ...args) {
    freshtabUrls.forEach(url =>
      this.core.action(
        'callContentAction',
        'freshtab',
        action,
        { url },
        ...args,
      ));
  },

  _onVisitRemoved(removed) {
    if (removed.allHistory) {
      this.actions.refreshHistoryDependentPages();
      return;
    }
    historyWhitelist.forEach((url) => {
      this.core.action(
        'callContentAction',
        'history',
        'updateHistoryUrls',
        { url },
        { urls: removed.urls }
      );
    });
  },

  async browserTheme() {
    if (browser.cliqz) {
      let browserTheme = await browser.cliqz.getTheme();
      if (browserTheme === undefined) {
        browserTheme = 'light';
      }
      return browserTheme;
    }
    return '';
  },

  /*
  * Blue theme is supported only for CLIQZ users above 1.16.0
  */
  get isBlueThemeSupported() {
    return isCliqzBrowser || prefs.get(DEVELOPER_FLAG_PREF, false);
  },

  get isBrowserThemeSupported() {
    return isCliqzBrowser || prefs.get(DEVELOPER_FLAG_PREF, false);
  },

  get isAllPreferencesLinkSupported() {
    return isCliqzBrowser;
  },

  get isCustomBackgroundSupported() {
    return prefs.get(CUSTOM_BG_PREF, false);
  },

  get tooltip() {
    let activeTooltip = '';
    const dismissedMessages = prefs.getObject(DISMISSED_ALERTS);
    const freshtabConfig = prefs.getObject(FRESHTAB_CONFIG_PREF);

    const isActive = (id) => {
      const meta = dismissedMessages[id] || {};
      if (meta.isDismissed) {
        return false;
      }

      if (!(Object.keys(freshtabConfig).length === 1
        && freshtabConfig.news
        && freshtabConfig.news.hasUserChangedLanguage
      )) {
        return false;
      }

      if (meta.skippedAt) {
        return moment().diff(meta.skippedAt, 'hours') >= 48;
      }

      return true;
    };

    if (isActive('tooltip-settings')) {
      activeTooltip = 'tooltip-settings';
    }

    return activeTooltip;
  },

  async getComponentsState() {
    const freshtabConfig = prefs.getObject(FRESHTAB_CONFIG_PREF);
    const backgroundName = (freshtabConfig.background && freshtabConfig.background.image)
      || getDefaultWallpaper(product);
    const wallpapers = await getWallpapers();
    return {
      historyDials: { ...COMPONENT_STATE_VISIBLE, ...freshtabConfig.historyDials },
      customDials: {
        ...(this.hasCustomDialups() ? COMPONENT_STATE_VISIBLE : COMPONENT_STATE_INVISIBLE),
        ...freshtabConfig.customDials,
      },
      search: {
        ...COMPONENT_STATE_VISIBLE,
        ...freshtabConfig.search,
        mode: prefs.get(config.constants.PREF_SEARCH_MODE, 'urlbar'),
      },
      news: {
        ...COMPONENT_STATE_VISIBLE,
        ...freshtabConfig.news,
        availableEditions: await this.news.action('getAvailableLanguages'),
        preferedCountry: await this.news.action('getLanguage'),
      },
      background: {
        image: backgroundName,
        index: wallpapers.findIndex(bg => bg.name === backgroundName),
      },
      stats: { ...COMPONENT_STATE_VISIBLE, ...freshtabConfig.stats },
    };
  },

  async getWallpapers() {
    const wallpapers = getWallpapers(product);
    if (this.isCustomBackgroundSupported) {
      const customWp = await this.db.wallpapers.get('1');
      if (customWp) {
        const src = URL.createObjectURL(customWp.blob);
        const wp = {
          alias: 'custom-background',
          isDefault: false,
          name: config.constants.CUSTOM_BG,
          src,
          thumbnailSrc: src,
        };
        wallpapers.push(wp);
      }
    }
    return wallpapers;
  },

  /**
    * @return all visible speedDials
    */
  async getVisibleDials(historyLimit) {
    const dials = await this.actions.getSpeedDials();
    return {
      ...dials,
      history: dials.history.slice(0, historyLimit)
    };
  },

  isUserOnboarded() {
    if (!config.settings.onBoardingPref) return false;
    return prefs.get(config.settings.onBoardingPref, false);
  },

  onboardingVersion() {
    // if we set the onboardingVersion pref via AB test then it will be set later
    // than we call this function (on which onboarding version depends)
    const onboardingVersion = prefs.get('onboardingVersion', config.settings.onboardingVersion);
    if (onboardingVersion) {
      return onboardingVersion;
    }
    const randomVersion = Math.random() < 0.5 ? 3 : 4;
    prefs.set('onboardingVersion', randomVersion);
    return randomVersion;
  },

  updateComponentState(component, state) {
    const _config = prefs.getObject(FRESHTAB_CONFIG_PREF);
    _config[component] = { ..._config[component], ...state };
    prefs.setObject(FRESHTAB_CONFIG_PREF, _config);
  },

  async _onSpeedDialsChanged() {
    const dials = await SpeedDials.get();
    this._callFreshtabAction('updateSpeedDials', dials, SpeedDials.hasHidden);
  },

  hasCustomDialups() {
    return SpeedDials.hasCustom;
  },

  actions: {
    resetStatistics() {
      if (this.insights.isPresent()) {
        this.insights.action('clearData');
      }
    },

    markTooltipAsSkipped() {
      const tooltip = this.tooltip;
      if (!tooltip) {
        return;
      }
      const dismissedMessages = prefs.getObject(DISMISSED_ALERTS);
      prefs.setObject(DISMISSED_ALERTS, {
        ...dismissedMessages,
        [tooltip]: {
          ...dismissedMessages[tooltip],
          skippedAt: Date.now()
        },
      });
    },

    sendUserFeedback(data) {
      const feedback = {
        view: 'tab',
        ...data,
      };
      this.core.action('sendUserFeedback', feedback);
    },

    toggleComponent(component) {
      const _config = prefs.getObject(FRESHTAB_CONFIG_PREF);
      // component might be uninitialized
      const COMPONENT_DEFAULT_STATE = component !== 'customDials' || this.hasCustomDialups()
        ? COMPONENT_STATE_VISIBLE
        : COMPONENT_STATE_INVISIBLE;
      _config[component] = { ...COMPONENT_DEFAULT_STATE, ..._config[component] };
      _config[component].visible = !_config[component].visible;
      prefs.setObject(FRESHTAB_CONFIG_PREF, _config);
    },

    saveBackgroundImage(name, index) {
      this.updateComponentState('background', {
        image: name,
        index
      });
    },

    async saveCustomBackgroundImage(src) {
      // TODO: we could skip fetching resource here if we stored
      // the image directly on the freshtab page
      const response = await fetch(src);
      if (!response.ok) {
        console.error('Could not load custom background:', response.statusText);
        return;
      }
      try {
        const blob = await response.blob();
        await this.db.wallpapers.put({ id: '1', blob });
      } catch (e) {
        console.error('Could not save custom background:', e);
      }
    },

    async updateTopNewsCountry(preferedCountry) {
      // TODO: add proper error handling in UI
      await this.news.action('setLanguage', preferedCountry);

      this.updateComponentState('news', {
        hasUserChangedLanguage: true,
      });
    },

    saveMessageDismission(message) {
      prefs.setObject('dismissedAlerts', (prevValue) => {
        const oldMessage = prevValue[message.id] || {
          scope: 'freshtab',
          count: 0,
        };
        return {
          ...prevValue,
          [message.id]: {
            ...oldMessage,
            isDismissed: true,
            count: oldMessage.count + 1,
          }
        };
      });
    },

    checkForHistorySpeedDialsToRestore() {
      return SpeedDials.hasHidden;
    },

    /**
    * Get history based & user defined speedDials
    * @method getSpeedDials
    */
    getSpeedDials() {
      return SpeedDials.get();
    },

    /**
     * Remove a speedDial
     * @method removeSpeedDial
     * @param {item}  The item to be removed.
     */
    removeSpeedDial(...args) {
      return SpeedDials.remove(...args);
    },

    /**
    * Edit an existing speedDial
    * @method editSpeedDial
    * @params dial_to_edit, {url, title}
    */
    editSpeedDial(urlToEdit, newDial) {
      return SpeedDials.editCustom(urlToEdit, newDial);
    },

    /**
    * Add a new speedDial to be appeared in the 2nd row
    * @method addSpeedDial
    * @param url {string}
    */
    addSpeedDial(url) {
      return SpeedDials.addCustom(url);
    },

    /**
    * Revert history url
    * @method revertHistorySpeedDial
    * @param url string
    */
    revertHistorySpeedDial(url) {
      return SpeedDials.restore(url);
    },

    /**
    * A speed dial has been clicked
    * @method speedDialClicked
    */
    speedDialClicked() {
      if (this.insights.isPresent()) {
        this.insights.action('insertSearchStats', { speedDialClicked: 1 });
      }
    },

    /**
    * Reset all history speed dials
    * @method resetAllHistory
    */
    resetAllHistory() {
      SpeedDials.restoreAll();
      return SpeedDials.get();
    },

    removeFromHistory(url, { strict }) {
      return HistoryManager.removeFromHistory(url, { strict });
    },

    removeFromBookmarks(url) {
      return HistoryManager.removeFromBookmarks(url);
    },
    /**
    * Get list with top & personalized news
    * @method getNews
    */
    async getNews() {
      // disables the whole news block if required by the config
      if (!this.settings.freshTabNews) {
        return {
          version: -1,
          news: []
        };
      }

      return this.news.action('getNews');
    },

    /**
    * Get stats for ghostery tab
    * @method getStats
    */
    async getStats() {
      const formatNumber = (number) => {
        if (!number) {
          return '0';
        }

        return (number > 999999 ? `${(number / 1000000).toFixed()}M` : number)
          .toLocaleString();
      };

      const locale = getLanguageFromLocale(i18n.PLATFORM_LOCALE);

      let data = [];
      let promoData = {};

      if (product === 'CLIQZ' && this.insights.isPresent()) {
        const [summary, searchTimeSaved] = await Promise.all([
          this.insights.action('getDashboardStats'),
          this.insights.action('getSearchTimeSaved'),
        ]);
        const isAntitrackingDisabled = !prefs.get('modules.antitracking.enabled', true);

        const adbPref = prefs.get('cliqz-adb', true);
        const isAdBlockerDisabled = adbPref === false || adbPref === 0;

        data = [
          {
            title: `${getMessage('freshtab_stats_cliqz_trackers_blocked')}`,
            icon: 'images/cliqz-shield.svg',
            val: formatNumber(summary.cookiesBlocked + summary.fingerprintsRemoved),
            description: `${getMessage('freshtab_stats_cliqz_trackers_blocked_desc')}`,
            link: 'https://cliqz.com/support/privacy-statistics#anti-tracking',
            disabled: isAntitrackingDisabled,
          },
          {
            title: `${getMessage('freshtab_stats_ads_blocked')}`,
            icon: 'images/cliqz-ad-blocker.svg',
            val: formatNumber(summary.adsBlocked),
            description: `${getMessage('freshtab_stats_ads_blocked_by_desc', 'Cliqz')}`,
            link: 'https://cliqz.com/support/privacy-statistics#ads',
            disabled: isAdBlockerDisabled,
          },
          {
            title: `${getMessage('freshtab_stats_time_saved')}`,
            icon: 'images/cliqz-time.svg',
            val: formatTime((summary.timeSaved || 0) + searchTimeSaved, locale),
            description: `${getMessage('freshtab_stats_time_saved_desc')}`,
            link: 'https://cliqz.com/support/privacy-statistics#time-saved',
            disabled: false, // Always active
          },
        ];
      } else if (product === 'GHOSTERY') {
        const ghosteryExtId = isChromium
          ? 'mlomiejdfkolichcflejclcbmpeaniij' : 'firefox@ghostery.com';
        const stats = await extChannel.sendMessage(ghosteryExtId, { name: 'getStatsAndSettings' });
        const summary = stats && stats.historicalDataAndSettings;

        if (summary) {
          // TODO: update links
          const dataPointsAnonymized = summary.cumulativeData.cookiesBlocked
            + summary.cumulativeData.fingerprintsRemoved;
          data = [
            {
              title: `${getMessage('freshtab_stats_gt_trackers_blocked')}`,
              icon: 'images/stats-anti-tracking.svg',
              val: formatNumber(summary.cumulativeData.trackersBlocked),
              description: `${getMessage('freshtab_stats_gt_trackers_seen', formatNumber(summary.cumulativeData.trackersDetected))}`,
              link: 'https://www.ghostery.com/faqs/what-do-the-statistics-in-ghostery-start-tab-show-2/',
              disabled: !summary.blockTrackersEnabled,
            },
            {
              title: `${getMessage('freshtab_stats_dp_anonymized')}`,
              icon: 'images/stats-datapoints.svg',
              val: formatNumber(dataPointsAnonymized),
              description: `${getMessage('freshtab_stats_data_anonymized_by_desc', 'Ghostery')}`,
              link: 'https://www.ghostery.com/faqs/what-do-the-statistics-in-ghostery-start-tab-show-2/',
              disabled: !summary.antiTrackingEnabled,
            },
            {
              title: `${getMessage('freshtab_stats_ads_blocked')}`,
              icon: 'images/stats-ad-blocker.svg',
              val: formatNumber(summary.cumulativeData.adsBlocked),
              description: `${getMessage('freshtab_stats_ads_blocked_by_desc', 'Ghostery')}`,
              link: 'https://www.ghostery.com/faqs/what-do-the-statistics-in-ghostery-start-tab-show-2/',
              disabled: !summary.adBlockEnabled,
            },
          ];
        } else {
          const downloadGhosteryLink = isChromium
            ? 'https://chrome.google.com/webstore/detail/ghostery-–-privacy-ad-blo/mlomiejdfkolichcflejclcbmpeaniij'
            : 'https://addons.mozilla.org/firefox/addon/ghostery/';
          promoData = {
            brand: {
              name: `${getMessage('promo_data_brand_name')}`,
              icon: 'images/ghosty.svg',
            },
            description: `${getMessage('promo_data_description')} ${getMessage('promo_data_description_2')}`,
            learnMore: {
              text: `${getMessage('learn_more')}`,
              link: 'https://www.ghostery.com/',
            },
            buttons: [
              {
                label: `${getMessage('add_to_browser', isChromium ? 'Chrome' : 'Firefox')}`,
                link: downloadGhosteryLink,
              },
            ]
          };
        }
      }

      return {
        data,
        isEmpty: !data.length,
        promoData,
      };
    },

    /**
    * Get configuration regarding locale, onBoarding and browser
    * @method getConfig
    */
    async getConfig(sender) {
      const tabIndex = sender.tab.id;

      // delete import bookmarks top notification in case of onboarding v4
      if (this.onboardingVersion() === 4) {
        delete this.messages.import;
      }

      return {
        locale: getLanguageFromLocale(i18n.PLATFORM_LOCALE),
        blueTheme: await this.blueThemeManager.isEnabled(),
        browserTheme: await this.browserTheme(),
        isBlueThemeSupported: this.isBlueThemeSupported,
        isBrowserThemeSupported: this.isBrowserThemeSupported,
        isAllPrefsLinkSupported: this.isAllPreferencesLinkSupported,
        isCustomBackgroundSupported: this.isCustomBackgroundSupported,
        wallpapers: await this.getWallpapers(product),
        product,
        tabIndex,
        messages: this.messages,
        isHistoryEnabled: (
          this.history.isEnabled()
          && config.settings.HISTORY_URL !== undefined
        ),
        componentsState: await this.getComponentsState(),
        developer: prefs.get('developer', false),
        cliqzPostPosition: 'bottom-left', // bottom-right, top-right
        isStatsSupported: this.settings.freshTabStats,
        NEW_TAB_URL: '',
        HISTORY_URL,
        isBetaVersion: isBetaVersion(),
        isUserOnboarded: this.isUserOnboarded(),
        onboardingVersion: this.onboardingVersion(),
        tooltip: this.tooltip,
        showConsentDialog: isAMO && !prefs.get('consentDialogShown', false),
        isAMO,
      };
    },

    async setBrowserTheme(theme) {
      if (browser.cliqz) {
        await browser.cliqz.setTheme(`firefox-compact-${theme}@mozilla.org`);
      }
    },

    /**
    * @method toggleBlueTheme
    */
    async toggleBlueTheme() {
      // Cliqz browser listens for pref change and takes care of toggling the class
      // For dev mode there is webextension API which listens to pref change
      if (await this.blueThemeManager.isEnabled()) {
        await this.blueThemeManager.disable();
      } else {
        await this.blueThemeManager.enable();
      }
    },

    async refreshFrontend() {
      const tabs = await getTabsWithUrl(NEW_TAB_URL);
      tabs.forEach(({ id }) => reloadTab(id));
    },

    async refreshHistoryDependentPages() {
      const tabs = await queryTabs();
      tabs.forEach(({ id, url }) => {
        if (isHistoryDependentPage(url)) {
          reloadTab(id);
        }
      });
    },

    openImportDialog,

    openBrowserSettings() {
      browser.omnibox2.navigateTo('about:preferences', { target: 'tab' });
    },

    getState() {
      return { active: true };
    },

    isBlueThemeEnabled() {
      return this.blueThemeManager.isEnabled();
    },

    getBrowserTheme() {
      return this.browserTheme();
    },

    getComponentsState() {
      return this.getComponentsState();
    },

    isHumanWebEnabled() {
      return !prefs.get('humanWebOptOut', true);
    },

    setHumanWeb(consent) {
      prefs.set('humanWebOptOut', !consent);
      return consent;
    }
  },

  events: {
    'geolocation:wake-notification': function onWake() {
      this.actions.getNews().then(() => {
        this.actions.refreshFrontend();
      });
    },
  },
});
