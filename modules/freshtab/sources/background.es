/* eslint no-param-reassign: 'off' */
/* eslint func-names: 'off' */

import { chrome } from '../platform/globals';
import inject from '../core/kord/inject';
import telemetry from '../core/services/telemetry';
import NewTabPage from './main';
import News from './news';
import config from './config';
import { getWallpapers, getDefaultWallpaper } from './wallpapers';
import History from '../platform/freshtab/history';
import openImportDialog from '../platform/freshtab/browser-import-dialog';
import logos from '../core/services/logos';
import events from '../core/events';
import SpeedDial from './speed-dial';
import AdultDomain from './adult-domain';
import background from '../core/base/background';
import {
  forEachWindow,
  Window,
  getActiveTab,
} from '../core/browser';
import { queryTabs, reloadTab } from '../core/tabs';
import console from '../core/console';
import {
  getResourceUrl,
  isCliqzBrowser,
  isChromium,
  isAMO,
  product,
} from '../core/platform';
import prefs from '../core/prefs';
import { pauseMessage, dismissMessage, countMessageClick, saveMessageDismission } from './actions/message';
import i18n, { getLanguageFromLocale, getMessage } from '../core/i18n';
import hash from '../core/helpers/hash';
import HistoryService from '../platform/history-service';
import HistoryManager from '../core/history-manager';
import * as searchUtils from '../core/search-engines';
import {
  equals as areUrlsEqual,
  stripTrailingSlash,
  tryEncodeURIComponent,
  tryDecodeURIComponent,
} from '../core/url';
import { URLInfo } from '../core/url-info';
import extChannel from '../platform/ext-messaging';
import { isBetaVersion } from '../platform/platform';
import moment from '../platform/lib/moment';

const DIALUPS = 'extensions.cliqzLocal.freshtab.speedDials';
const FRESHTAB_CONFIG_PREF = 'freshtabConfig';
const BLUE_THEME_PREF = 'freshtab.blueTheme.enabled';
const DEVELOPER_FLAG_PREF = 'developer';
const DISMISSED_ALERTS = 'dismissedAlerts';

const blackListedEngines = [
  'Google Images',
  'Google Maps'
];

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

function makeErrorObject(reason) {
  return {
    error: true,
    reason: typeof reason === 'object' ? reason.toString() : reason
  };
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
  searchReminderCounter: 0,

  /**
  * @method init
  */
  init(settings) {
    if (isAMO && (prefs.get('freshtab.amo.rollout', false) === false)) {
      // no rollout done so we:
      //  1. turn it on for everybody who has it off
      //  2. reset their background to spring (all users)

      // we only do it once
      prefs.set('freshtab.amo.rollout', true);

      if (prefs.get('freshtab.state', false) === false) {
        prefs.set('freshtab.state', true);
      }

      this.actions.saveBackgroundImage('bg-spring');
    }

    this.newTabPage = NewTabPage;
    this.newTabPage.NEW_TAB_URL = NEW_TAB_URL;

    this.newTabPage.startup();

    this.adultDomainChecker = new AdultDomain();
    this.settings = settings;
    this.messages = {};
    this.onVisitRemoved = this._onVisitRemoved.bind(this);

    HistoryService.onVisitRemoved.addListener(this.onVisitRemoved);
  },
  /**
  * @method unload
  */
  unload({ quick = false } = {}) {
    News.unload();

    if (quick) {
      this.newTabPage.shutdown();
    } else {
      this.newTabPage.rollback();
    }

    HistoryService.onVisitRemoved.removeListener(this.onVisitRemoved);
  },

  _onVisitRemoved(removed) {
    if (removed.allHistory) {
      this.actions.refreshHistoryDependentPages();
      return;
    }
    historyWhitelist.forEach((url) => {
      this.core.action(
        'broadcastMessage',
        url,
        {
          action: 'updateHistoryUrls',
          message: { urls: removed.urls },
        }
      );
    });
  },

  isAdult(url) {
    return this.adultDomainChecker.isAdult(URLInfo.get(url).generalDomain);
  },

  get blueTheme() {
    return prefs.get(BLUE_THEME_PREF, false, 'extensions.cliqz.');
  },

  async browserTheme() {
    if (chrome.cliqz) {
      let browserTheme = await chrome.cliqz.getTheme();
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
      historyDials: Object.assign({}, COMPONENT_STATE_VISIBLE, freshtabConfig.historyDials),
      customDials: Object.assign({},
        this.actions.hasCustomDialups() ? COMPONENT_STATE_VISIBLE : COMPONENT_STATE_INVISIBLE,
        freshtabConfig.customDials),
      search: {
        ...COMPONENT_STATE_VISIBLE,
        ...freshtabConfig.search,
        mode: prefs.get(config.constants.PREF_SEARCH_MODE, 'urlbar'),
      },
      news: Object.assign({}, COMPONENT_STATE_VISIBLE, freshtabConfig.news),
      background: {
        image: backgroundName,
        index: getWallpapers(product).findIndex(bg => bg.name === backgroundName),
      },
      stats: Object.assign({}, COMPONENT_STATE_VISIBLE, freshtabConfig.stats),
      searchReminder: Object.assign({}, COMPONENT_STATE_VISIBLE, freshtabConfig.searchReminder),
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

  updateComponentState(component, state) {
    const _config = prefs.getObject(FRESHTAB_CONFIG_PREF);
    _config[component] = Object.assign({}, _config[component], state);
    prefs.setObject(FRESHTAB_CONFIG_PREF, _config);
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
      const COMPONENT_DEFAULT_STATE = component !== 'customDials' || this.actions.hasCustomDialups()
        ? COMPONENT_STATE_VISIBLE
        : COMPONENT_STATE_INVISIBLE;
      _config[component] = Object.assign({}, COMPONENT_DEFAULT_STATE, _config[component]);
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
      const history = JSON.parse(prefs.get(DIALUPS, '{}')).history || {};
      return Object.keys(history).length > 0;
    },

    hasCustomDialups() {
      return (JSON.parse(prefs.get(DIALUPS, '{}')).custom || []).length;
    },

    /**
    * Get history based & user defined speedDials
    * @method getSpeedDials
    */
    async getSpeedDials() {
      const start = Date.now();
      const speedDialsTimers = { customDials: 0, historyDials: 0 };
      const dialUps = prefs.has(DIALUPS) ? JSON.parse(prefs.get(DIALUPS, '')) : [];
      let historyDialups = [];
      let customDialups = dialUps.custom ? dialUps.custom : [];
      await searchUtils.isSearchServiceReady();
      const searchEngines = searchUtils.getSearchEngines(blackListedEngines);

      historyDialups = History.getTopUrls().then((results) => {
        console.log('History', JSON.stringify(results));
        // hash history urls
        results = results.map(r =>
          ({
            title: r.title,
            url: r.url,
            hashedUrl: hash(r.url),
            total_count: r.total_count,
            custom: false
          }));

        function isDeleted(url) {
          return dialUps.history
            && (url in dialUps.history)
            && dialUps.history[url].hidden === true;
        }

        function isCustom(url) {
          url = stripTrailingSlash(url);

          let _isCustom = false;

          if (dialUps && dialUps.custom) {
            dialUps.custom.some((dialup) => {
              if (stripTrailingSlash(tryDecodeURIComponent(dialup.url)) === url) {
                _isCustom = true;
                return true;
              }
              return false;
            });
          }
          return _isCustom;
        }

        function isCliqz(url) {
          return url.indexOf(config.settings.SUGGESTIONS_URL) === 0;
        }

        function isMozUrl(url) {
          return url.startsWith('moz-extension://');
        }

        results = results
          .filter(history =>
            !isDeleted(history.hashedUrl) && !isCustom(history.url)
                    && !this.isAdult(history.url) && !isCliqz(history.url)
                    && !isMozUrl(history.url))
          .map((r) => {
            const dialSpecs = {
              url: r.url,
              title: r.title,
              isCustom: false
            };
            return new SpeedDial(dialSpecs, searchEngines);
          });
        speedDialsTimers.historyDials = Date.now() - start;
        return results;
      });

      if (customDialups.length > 0) {
        customDialups = customDialups.map((dialup) => {
          const dialSpecs = {
            url: tryDecodeURIComponent(dialup.url),
            title: dialup.title,
            isCustom: true,
          };
          return new SpeedDial(dialSpecs, searchEngines);
        });
        speedDialsTimers.customDials = Date.now() - start;
      }

      // Promise all concatenate results and return
      return Promise.all([historyDialups, customDialups]).then(results =>
      // TODO EX-4276: uncomment when moving Freshtab to WebExtensions
      // const urls = new Set();

      // const history = results[0].filter((dial) => {
      //   if (urls.has(dial.id)) {
      //     return false;
      //   } else {
      //     urls.add(dial.id);
      //     return true;
      //   }
      // });

        ({
          history: results[0],
          custom: results[1],
          speedDialsTimers,
        }));
    },

    /**
     * Remove a speedDial
     * @method removeSpeedDial
     * @param {item}  The item to be removed.
     */
    removeSpeedDial(item) {
      const isCustom = item.custom;
      const url = isCustom ? item.url : hash(item.url);
      const dialUps = JSON.parse(prefs.get(DIALUPS, '{}'));

      if (isCustom) {
        dialUps.custom = dialUps.custom.filter(dialup =>
          tryDecodeURIComponent(dialup.url) !== url);
      } else {
        if (!dialUps.history) {
          dialUps.history = {};
        }
        dialUps.history[url] = { hidden: true };
      }

      prefs.set(DIALUPS, JSON.stringify(dialUps));
    },

    /**
    * Edit an existing speedDial
    * @method editSpeedDial
    * @params dial_to_edit, {url, title}
    */

    async editSpeedDial(item, { url, title = '' }) {
      const urlToAdd = stripTrailingSlash(url);
      const validUrl = SpeedDial.getValidUrl(urlToAdd);
      await searchUtils.isSearchServiceReady();
      const searchEngines = searchUtils.getSearchEngines(blackListedEngines);

      if (!validUrl) {
        return makeErrorObject('invalid');
      }

      const dials = await this.getVisibleDials(config.constants.MAX_SPOTS);
      const allDials = [...dials.history, ...dials.custom];
      const isDuplicate = allDials
        .map(dial => ({ ...dial, url: tryDecodeURIComponent(dial.url) }))
        .filter(dial => !areUrlsEqual(dial.url, item.url))
        .some(dial => areUrlsEqual(validUrl, dial.url));

      if (isDuplicate) {
        return makeErrorObject('duplicate');
      }

      const savedDials = prefs.getObject(DIALUPS);
      if (!savedDials.custom) {
        savedDials.custom = [];
      }
      const index = savedDials.custom.findIndex(
        dial => areUrlsEqual(tryDecodeURIComponent(dial.url), item.url)
      );

      prefs.setObject(DIALUPS, {
        ...savedDials,
        custom: [
          ...savedDials.custom.slice(0, index),
          {
            url: validUrl,
            title,
          },
          ...savedDials.custom.slice(index + 1),
        ],
      });

      return new SpeedDial({ url: validUrl, title }, searchEngines);
    },

    /**
    * Add a new speedDial to be appeared in the 2nd row
    * @method addSpeedDial
    * @param url {string}
    */

    async addSpeedDial({ url, title = '' }, index) {
      const urlToAdd = stripTrailingSlash(url);
      const validUrl = SpeedDial.getValidUrl(urlToAdd);
      await searchUtils.isSearchServiceReady();
      const searchEngines = searchUtils.getSearchEngines(blackListedEngines);

      if (!validUrl) {
        return makeErrorObject('invalid');
      }

      // history returns most frequest 15 results, but we display up to 6
      // so we need to validate only against visible results
      const dials = await this.getVisibleDials(config.constants.MAX_SPOTS);
      const allDials = [...dials.history, ...dials.custom];

      const isDuplicate = allDials
        .map(dial => ({ ...dial, url: tryDecodeURIComponent(dial.url) }))
        .some(dial => areUrlsEqual(validUrl, dial.url));

      if (isDuplicate) {
        return makeErrorObject('duplicate');
      }

      const savedDials = prefs.getObject(DIALUPS);
      if (!savedDials.custom) {
        savedDials.custom = [];
      }

      const dialup = {
        url: tryEncodeURIComponent(validUrl),
        title
      };
      const dialSpecs = {
        url: validUrl,
        title,
        isCustom: true,
      };

      if (index !== null) {
        savedDials.custom.splice(index, 0, dialup);
      } else {
        savedDials.custom.push(dialup);
      }

      prefs.setObject(DIALUPS, {
        ...savedDials
      });
      // prefs.set(DIALUPS, JSON.stringify(dialUps), '');
      return new SpeedDial(dialSpecs, searchEngines);
    },

    /**
    * Parse speedDials
    * @method parseSpeedDials
    */
    parseSpeedDials() {
      return JSON.parse(prefs.get(DIALUPS, '{}'));
    },

    /**
    * Save speedDials
    * @method saveSpeedDials
    * @param dialUps object
    */
    saveSpeedDials(dialUps) {
      prefs.set(DIALUPS, JSON.stringify(dialUps));
    },

    /**
    * Revert history url
    * @method revertHistorySpeedDial
    * @param url string
    */
    revertHistorySpeedDial(url) {
      const dialUps = this.actions.parseSpeedDials();
      delete dialUps.history[hash(url)];
      this.actions.saveSpeedDials(dialUps);
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
      const dialUps = this.actions.parseSpeedDials();
      dialUps.history = {};
      this.actions.saveSpeedDials(dialUps);
      return this.actions.getSpeedDials();
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
            displayUrl: URLInfo.get(r.url).cleanHost || r.title,
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

      const formatTime = (ms) => {
        if (!ms) {
          return '0 s';
        }

        const seconds = Math.floor(ms / 1000);

        if (seconds >= 3600) {
          const hours = Math.floor(seconds / 3600);
          return `${hours} h`;
        }
        if (seconds >= 60) {
          const minutes = Math.floor(seconds / 60);
          return `${minutes} min`;
        }
        return `${seconds} s`;
      };

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
            val: formatTime((summary.timeSaved || 0) + searchTimeSaved),
            description: `${getMessage('freshtab_stats_time_saved_desc')}`,
            link: 'https://cliqz.com/support/privacy-statistics#time-saved',
            disabled: false, // Always active
          },
        ];
      } else if (product === 'GHOSTERY') {
        const ghosteryExtId = isChromium
          ? 'mlomiejdfkolichcflejclcbmpeaniij' : 'firefox@ghostery.com';
        const summary = await new Promise((resolve) => {
          extChannel.sendMessage(ghosteryExtId, { name: 'getStatsAndSettings' },
            ({ historicalDataAndSettings } = {}) => resolve(historicalDataAndSettings));
        });

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
      const windowWrapper = Window.findByTabId(sender.tab.id);

      // Count when the search reminder is not shown
      if (!this.getComponentsState().searchReminder.visible) {
        if (this.searchReminderCounter === 6) {
          this.actions.toggleComponent('searchReminder');
        }
        this.searchReminderCounter += 1;
      }

      // and set it on focus if missing
      if (windowWrapper) {
        this.ui.windowAction(windowWrapper.window, 'setUrlbarValue', '', {
          match: NEW_TAB_URL,
          focus: true,
        });
      }

      const { id: tabIndex } = await getActiveTab();

      return {
        searchReminderCounter: this.searchReminderCounter,
        locale: getLanguageFromLocale(i18n.PLATFORM_LOCALE),
        blueTheme: this.blueTheme,
        browserTheme: await this.browserTheme(),
        isBlueThemeSupported: this.isBlueThemeSupported,
        isBrowserThemeSupported: this.isBrowserThemeSupported,
        wallpapers: getWallpapers(product),
        product,
        tabIndex,
        messages: this.messages,
        isHistoryEnabled: (
          prefs.get('modules.history.enabled', false)
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
        tooltip: this.tooltip,
      };
    },

    async setBrowserTheme(theme) {
      if (chrome.cliqz) {
        telemetry.push({ theme }, 'freshtab.prefs.browserTheme');
        await chrome.cliqz.setTheme(`firefox-compact-${theme}@mozilla.org`);
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

    /**
    * revert back to old "new tab"
    * @method revertBack
    */
    revertBack() {
      this.newTabPage.rollback();
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

    refreshFrontend() {
      forEachWindow((window) => {
        const tabs = [...window.gBrowser.tabs];
        tabs.forEach((tab) => {
          const browser = tab.linkedBrowser;
          if (browser.currentURI.spec === NEW_TAB_URL) {
            browser.reload();
          }
        });
      });
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

    // The following three actions are used to emit Anolysis metrics about
    // freshtab's state.

    getState() {
      return { active: this.newTabPage.isActive };
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
    reportEvent({ type }) {
      if (type === 'urlbar-focus') {
        this.searchSession.setSearchSession();
        if (this.searchReminderCounter < 7) {
          this.searchReminderCounter = 0;
        }
      }
    }
  },

  events: {
    'control-center:cliqz-tab': function () {
      if (this.newTabPage.isActive) {
        this.newTabPage.rollback();
      } else {
        this.newTabPage.enableNewTabPage();
        this.newTabPage.enableHomePage();
      }

      this.newTabPage.setPersistentState(!this.newTabPage.isActive);
    },
    'message-center:handlers-freshtab:new-message': function onNewMessage(message) {
      const id = message.id;
      if (!(id in this.messages)) {
        this.messages[id] = message;
        this.core.action(
          'broadcastMessage',
          NEW_TAB_URL,
          {
            action: 'addMessage',
            message,
          }
        );
      }
    },
    'message-center:handlers-freshtab:clear-message': function onMessageClear(message) {
      const id = message.id;
      delete this.messages[id];
      this.core.action(
        'broadcastMessage',
        NEW_TAB_URL,
        {
          action: 'closeNotification',
          messageId: id,
        }
      );
    },
    'geolocation:wake-notification': function onWake() {
      this.actions.getNews().then(() => {
        this.actions.refreshFrontend();
      });
    },
  },
});
