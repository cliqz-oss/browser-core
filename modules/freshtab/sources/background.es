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
import News from './news';
import config from './config';
import { getWallpapers, getDefaultWallpaper } from './wallpapers';
import openImportDialog from '../platform/freshtab/browser-import-dialog';
import logos from '../core/services/logos';
import events from '../core/events';
import SpeedDials from './speed-dials';
import background from '../core/base/background';
import { queryTabs, reloadTab, getTabsWithUrl } from '../core/tabs';
import {
  getResourceUrl,
  isCliqzBrowser,
  isChromium,
  product,
} from '../core/platform';
import prefs from '../core/prefs';
import { pauseMessage, dismissMessage, countMessageClick, saveMessageDismission } from './actions/message';
import i18n, { getLanguageFromLocale, getMessage } from '../core/i18n';
import HistoryService from '../platform/history-service';
import HistoryManager from '../core/history-manager';
import * as searchUtils from '../core/search-engines';
import { getCleanHost } from '../core/url';
import { URLInfo } from '../core/url-info';
import extChannel from '../platform/ext-messaging';
import { isBetaVersion } from '../platform/platform';
import moment from '../platform/lib/moment';
import formatTime from './utils';

const FRESHTAB_CONFIG_PREF = 'freshtabConfig';
const BLUE_THEME_PREF = 'freshtab.blueTheme.enabled';
const DEVELOPER_FLAG_PREF = 'developer';
const DISMISSED_ALERTS = 'dismissedAlerts';

const COMPONENT_STATE_VISIBLE = {
  visible: true,
};

const COMPONENT_STATE_INVISIBLE = {
  visible: false,
};

const NEW_TAB_URL = isChromium ? 'chrome://newtab/' : getResourceUrl(config.settings.NEW_TAB_URL);
const HISTORY_URL = getResourceUrl(config.settings.HISTORY_URL);

const historyWhitelist = [
  NEW_TAB_URL,
  HISTORY_URL
];

if (config.settings.frameScriptWhitelist) {
  historyWhitelist.push(...config.settings.frameScriptWhitelist);
}

function isHistoryDependentPage(url) {
  return historyWhitelist.some(u => url.indexOf(u) === 0);
}

/**
 * @module freshtab
 * @namespace freshtab
 * @class Background
 */
export default background({
  // Modules dependencies
  core: inject.module('core'),
  messageCenter: inject.module('message-center'),
  search: inject.module('search'),
  ui: inject.module('ui'),
  insights: inject.module('insights'),
  history: inject.module('history'),

  // Services dependencies
  geolocation: inject.service('geolocation', ['setLocationPermission']),
  searchSession: inject.service('search-session', ['setSearchSession']),

  requiresServices: [
    'geolocation',
    'logos',
    'pacemaker',
    'search-session',
    'session',
    'telemetry',
  ],

  /**
  * @method init
  */
  init(settings) {
    this.settings = settings;
    this.messages = {};
    this.onVisitRemoved = this._onVisitRemoved.bind(this);
    this.onSpeedDialsChanged = this._onSpeedDialsChanged.bind(this);
    this.onThemeChanged = this._onThemeChanged.bind(this);

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
    News.unload();

    HistoryService.onVisitRemoved.removeListener(this.onVisitRemoved);
    SpeedDials.onChanged.removeListener(this.onSpeedDialsChanged);
    if (browser.cliqz) {
      browser.cliqz.onPrefChange.removeListener(this.onThemeChanged);
    }
  },

  status() {
    return {
      visible: true,
      enabled: true,
    };
  },

  async _onThemeChanged() {
    const theme = await this.browserTheme();
    this.core.action(
      'callContentAction',
      'freshtab',
      'updateBrowserTheme',
      { url: NEW_TAB_URL },
      theme,
    );
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

  get blueTheme() {
    return prefs.get(BLUE_THEME_PREF, false, 'extensions.cliqz.');
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

  get tooltip() {
    let activeTooltip = '';

    const freshtabConfig = prefs.getObject(FRESHTAB_CONFIG_PREF);
    const dismissedMessages = prefs.getObject(DISMISSED_ALERTS);
    const defaultNews = News.getNewsLanguage();

    const isActive = (id) => {
      const meta = dismissedMessages[id] || {};
      if (meta.isDismissed) {
        return false;
      }

      // check if freshtab settings were changed
      if (!(Object.keys(freshtabConfig).length === 1
        && freshtabConfig.news
        && freshtabConfig.news.preferedCountry === defaultNews
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

  getNewsEdition() {
    const { preferedCountry } = this.getComponentsState().news;
    if (!News.NEWS_BACKENDS.includes(preferedCountry)) {
      this.actions.updateTopNewsCountry('intl');
      return 'intl';
    }
    return preferedCountry;
  },

  getComponentsState() {
    const freshtabConfig = prefs.getObject(FRESHTAB_CONFIG_PREF);
    const backgroundName = (freshtabConfig.background && freshtabConfig.background.image)
      || getDefaultWallpaper(product);
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
      news: { ...COMPONENT_STATE_VISIBLE, ...freshtabConfig.news },
      background: {
        image: backgroundName,
        index: getWallpapers(product).findIndex(bg => bg.name === backgroundName),
      },
      stats: { ...COMPONENT_STATE_VISIBLE, ...freshtabConfig.stats },
    };
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
    this.core.action(
      'callContentAction',
      'freshtab',
      'updateSpeedDials',
      { url: NEW_TAB_URL },
      dials,
      SpeedDials.hasHidden
    );
  },

  hasCustomDialups() {
    return SpeedDials.hasCustom;
  },

  actions: {
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

    selectResult(
      selection,
      { tab: { id: tabId } = {} } = {},
    ) {
      const report = {
        ...selection,
        isPrivateResult: searchUtils.isPrivateResultType(selection.kind),
        tabId,
      };
      delete report.kind;

      events.pub('ui:click-on-url', report);

      this.search.action('reportSelection', report, { tab: { id: tabId } });
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

    updateTopNewsCountry(preferedCountry) {
      this.updateComponentState('news', {
        preferedCountry,
      });

      News.resetTopNews();
    },

    dismissMessage,
    pauseMessage,
    countMessageClick,
    saveMessageDismission,

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
    getNews() {
      // disables the whole news block if required by the config
      if (!this.settings.freshTabNews) {
        return {
          version: -1,
          news: []
        };
      }

      return News.getNews().then((news) => {
        News.init();

        const newsList = news.newsList || [];
        const topNewsVersion = news.topNewsVersion || 0;

        const edition = this.getNewsEdition();
        return {
          version: topNewsVersion,
          news: newsList.map(r => ({
            title: r.title_hyphenated || r.title,
            description: r.description,
            displayUrl: getCleanHost(URLInfo.get(r.url)) || r.title,
            logo: logos.getLogoDetails(r.url),
            url: r.url,
            type: r.type,
            breaking_label: r.breaking_label,
            edition,
          }))
        };
      });
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
        const summary = await extChannel.sendMessage(ghosteryExtId, { name: 'getStatsAndSettings' });

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
        blueTheme: this.blueTheme,
        browserTheme: await this.browserTheme(),
        isBlueThemeSupported: this.isBlueThemeSupported,
        isBrowserThemeSupported: this.isBrowserThemeSupported,
        isAllPrefsLinkSupported: this.isAllPreferencesLinkSupported,
        wallpapers: getWallpapers(product),
        product,
        tabIndex,
        messages: this.messages,
        isHistoryEnabled: (
          this.history.isEnabled()
          && config.settings.HISTORY_URL !== undefined
        ),
        componentsState: this.getComponentsState(),
        developer: prefs.get('developer', false),
        cliqzPostPosition: 'bottom-left', // bottom-right, top-right
        isStatsSupported: this.settings.freshTabStats,
        NEW_TAB_URL: '',
        HISTORY_URL,
        isBetaVersion: isBetaVersion(),
        isUserOnboarded: this.isUserOnboarded(),
        onboardingVersion: this.onboardingVersion(),
        tooltip: this.tooltip,
      };
    },

    async setBrowserTheme(theme) {
      if (browser.cliqz) {
        telemetry.push({ theme }, 'freshtab.prefs.browserTheme');
        await browser.cliqz.setTheme(`firefox-compact-${theme}@mozilla.org`);
      }
    },

    /**
    * @method toggleBlueTheme
    */
    toggleBlueTheme() {
      // Cliqz browser listens for pref change and takes care of toggling the class
      // For dev mode there is webextension API which listens to pref change
      if (this.blueTheme) {
        prefs.set(BLUE_THEME_PREF, false, 'extensions.cliqz.');
      } else {
        prefs.set(BLUE_THEME_PREF, true, 'extensions.cliqz.');
      }
    },

    shareLocation(decision) {
      events.pub('msg_center:hide_message', { id: 'share-location' }, 'MESSAGE_HANDLER_FRESHTAB');
      this.geolocation.setLocationPermission(decision);

      const target = (decision === 'yes')
        ? 'always_share' : 'never_share';

      telemetry.push({
        type: 'notification',
        action: 'click',
        topic: 'share-location',
        context: 'home',
        target
      });
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

    skipMessage(message) {
      events.pub('msg_center:hide_message', { id: message.id }, message.handler);
    },

    openImportDialog,

    openBrowserSettings() {
      browser.omnibox2.navigateTo('about:preferences', { target: 'tab' });
    },

    getState() {
      return { active: true };
    },

    isBlueThemeEnabled() {
      return this.blueTheme;
    },

    getBrowserTheme() {
      return this.browserTheme();
    },

    getComponentsState() {
      return this.getComponentsState();
    },
  },

  events: {
    'message-center:handlers-freshtab:new-message': function onNewMessage(message) {
      const id = message.id;
      if (!(id in this.messages)) {
        this.messages[id] = message;
        this.core.action(
          'callContentAction',
          'freshtab',
          'addMessage',
          { url: NEW_TAB_URL },
          message,
        );
      }
    },
    'message-center:handlers-freshtab:clear-message': function onMessageClear(message) {
      const id = message.id;
      delete this.messages[id];
      this.core.action(
        'callContentAction',
        'freshtab',
        'closeNotification',
        { url: NEW_TAB_URL },
        id,
      );
    },
    'geolocation:wake-notification': function onWake() {
      this.actions.getNews().then(() => {
        this.actions.refreshFrontend();
      });
    },
  },
});
