import inject from '../core/kord/inject';
import NewTabPage from './main';
import News from './news';
import History from '../platform/freshtab/history';
import utils from '../core/utils';
import events from '../core/events';
import SpeedDial from './speed-dial';
import AdultDomain from './adult-domain';
import background from '../core/base/background';
import { forEachWindow, mapWindows } from '../core/browser';
import { queryActiveTabs } from '../core/tabs';
import config from '../core/config';
import { isCliqzBrowser, isCliqzAtLeastInVersion } from '../core/platform';
import prefs from '../core/prefs';
import { dismissMessage, countMessageClick } from './actions/message';

const DIALUPS = 'extensions.cliqzLocal.freshtab.speedDials';
const FRESHTAB_CONFIG_PREF = 'freshtabConfig';
const BLUE_THEME_PREF  = 'freshtab.blueTheme.enabled';
const DEVELOPER_FLAG_PREF = 'developer';

const blackListedEngines = [
  'Google Images',
  'Google Maps'
];

const DEFAULT_COMPONENT_STATE = {
  visible: true,
};

const historyWhitelist = [
  config.settings.NEW_TAB_URL,
  config.settings.HISTORY_URL
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
  core: inject.module('core'),
  geolocation: inject.module('geolocation'),
  messageCenter: inject.module('message-center'),
  theme: inject.module('theme'),
  offersV2: inject.module('offers-v2'),
  requiresServices: ['logos'],

  /**
  * @method init
  */
  init(settings) {
    this.newTabPage = NewTabPage;

    this.newTabPage.startup();

    this.adultDomainChecker = new AdultDomain();
    this.settings = settings;
    this.messages = {};
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
  },

  isAdult(url) {
    return this.adultDomainChecker.isAdult(utils.getDetailsFromUrl(url).domain);
  },

  get shouldShowNewBrandAlert() {
    const isInABTest = prefs.get('freshtabNewBrand', false);
    const isDismissed = prefs.get('freshtabNewBrandDismissed', false);
    return config.settings.showNewBrandAlert && isInABTest && !isDismissed;
  },

  get showOffers() {
    return prefs.get('cliqzTabOffersNotification', false);
  },

  get blueTheme() {
    return prefs.get(BLUE_THEME_PREF, false);
  },

  /**
  * Blue theme is supported only for CLIQZ users above 1.16.0
  **/
  get isBlueThemeSupported() {
    const CLIQZ_1_16_OR_ABOVE  = isCliqzAtLeastInVersion('1.16.0');
    return isCliqzBrowser && CLIQZ_1_16_OR_ABOVE || prefs.get(DEVELOPER_FLAG_PREF, false);
  },

  /*
  * Blue background is supported for all AMO users
  * and CLIQZ users above 1.16.0
  **/
  get isBlueBackgroundSupported() {
    let isSupported = true;
    if (isCliqzBrowser && !isCliqzAtLeastInVersion("1.16.0")) {
      isSupported = false;
    }
    return isSupported || prefs.get(DEVELOPER_FLAG_PREF, false);
  },

  getComponentsState() {
    const config = JSON.parse(prefs.get(FRESHTAB_CONFIG_PREF, '{}'));
    let defaultBg = 'bg-default';
    if (this.isBlueBackgroundSupported) {
      defaultBg = 'bg-blue';
    }
    return {
      historyDials: Object.assign({}, DEFAULT_COMPONENT_STATE, config.historyDials),
      customDials:  Object.assign({}, DEFAULT_COMPONENT_STATE, config.customDials),
      search:       Object.assign({}, DEFAULT_COMPONENT_STATE, config.search),
      news:         Object.assign({}, DEFAULT_COMPONENT_STATE, config.news),
      background:   Object.assign({}, { image: defaultBg }, config.background),
    };
  },

  actions: {

    toggleComponent(component) {
      const config = JSON.parse(prefs.get(FRESHTAB_CONFIG_PREF, '{}'));
      // component might be uninitialized
      config[component] = Object.assign({}, DEFAULT_COMPONENT_STATE, config[component]);
      config[component].visible = !config[component].visible;
      prefs.set(FRESHTAB_CONFIG_PREF, JSON.stringify(config));
    },

    saveBackgroundImage(name) {
      prefs.set(FRESHTAB_CONFIG_PREF, JSON.stringify({
        ...JSON.parse(prefs.get(FRESHTAB_CONFIG_PREF, '{}')),
        background: {
          image: name,
        }
      }));
    },

    updateTopNewsCountry(country) {
      prefs.set(FRESHTAB_CONFIG_PREF, JSON.stringify({
        ...JSON.parse(prefs.get(FRESHTAB_CONFIG_PREF, '{}')),
        news: {
          preferedCountry: country,
        }
      }));

      News.resetTopNews();
    },

    dismissMessage,
    countMessageClick,

    checkForHistorySpeedDialsToRestore() {
      const history = JSON.parse(prefs.get(DIALUPS, '{}', '')).history
       || {};
      return Object.keys(history).length > 0;
    },

    /**
    * Get history based & user defined speedDials
    * @method getSpeedDials
    */
    getSpeedDials() {
      var dialUps = prefs.has(DIALUPS, '') ? JSON.parse(prefs.get(DIALUPS, '', '')) : [],
          historyDialups = [],
          customDialups = dialUps.custom ? dialUps.custom : [];
      const searchEngines = utils.getSearchEngines(blackListedEngines);


      historyDialups = History.getTopUrls().then(results => {
        utils.log("History", JSON.stringify(results));
        //hash history urls
        results = results.map(function(r) {
          return {
            title: r.title,
            url: r.url,
            hashedUrl: utils.hash(r.url),
            total_count: r.total_count,
            custom: false
          }
        });

        function isDeleted(url) {
          return dialUps.history && (url in dialUps.history) && dialUps.history[url].hidden === true;
        }

        function isCustom(url) {
          url = utils.stripTrailingSlash(url);

          var isCustom = false;

          if(dialUps && dialUps.custom) {

            dialUps.custom.some(function(dialup) {

              if(utils.stripTrailingSlash(utils.tryDecodeURIComponent(dialup.url)) === url) {
                isCustom = true;
                return true;
              }
            });
          }
          return isCustom;
        }

        function isCliqz(url) {
          return url.indexOf('https://cliqz.com/search?q=') === 0;
        }

        results = results.filter(history => {
          return !isDeleted(history.hashedUrl) && !isCustom(history.url)
                  && !this.isAdult(history.url) && !isCliqz(history.url);
        });

        return results.map(function(r){
          return new SpeedDial(r.url, searchEngines, false);
        });
      });



      if(customDialups.length > 0) {
        utils.log(customDialups, "custom dialups");
        customDialups = customDialups.map(function(dialup) {
          return new SpeedDial(utils.tryDecodeURIComponent(dialup.url), searchEngines, true);
        });
      }


      //Promise all concatenate results and return
      return Promise.all([historyDialups, customDialups]).then(function(results){
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

        return {
          history: results[0],
          custom: results[1]
        };
      });
    },

    /**
     * Remove a speedDial
     * @method removeSpeedDial
     * @param {item}  The item to be removed.
     */
    removeSpeedDial(item) {
      const isCustom = item.custom;
      const url = isCustom ? item.url : utils.hash(item.url);
      const dialUps = JSON.parse(prefs.get(DIALUPS, '{}', ''));

      if(isCustom) {
        dialUps.custom = dialUps.custom.filter(dialup => {
          return utils.tryDecodeURIComponent(dialup.url) !== url
        });
      } else {
        if(!dialUps.history) {
          dialUps.history = {};
        }
        dialUps.history[url] = { hidden: true };
      }

      prefs.set(DIALUPS, JSON.stringify(dialUps), '');
    },

    /**
    * @return all visible speedDials
    */
    getVisibleDials(historyLimit) {
      return this.actions.getSpeedDials().then((results) => {
        return results.history.slice(0, historyLimit);
      })
    },
    /**
    * Add a new speedDial to be appeared in the 2nd row
    * @method addSpeedDial
    * @param url {string}
    */
    addSpeedDial(url, index) {
      const urlToAdd = utils.stripTrailingSlash(url);
      const validUrl = SpeedDial.getValidUrl(urlToAdd);
      const searchEngines = utils.getSearchEngines(blackListedEngines);

      function makeErrorObject(reason) {
        return {
          error: true,
          reason: typeof reason === 'object' ? reason.toString() : reason
        };
      }

      if (!validUrl) {
        return Promise.resolve(makeErrorObject('invalid'));
      }

      //history returns most frequest 15 results, but we display up to 5
      //so we need to validate only against visible results
      return this.actions.getVisibleDials(5).then((result) => {
        const isDuplicate = result.some(function(dialup) {
          return validUrl === utils.stripTrailingSlash(dialup.url);
        });

        if(isDuplicate) {
          throw "duplicate";
        }
      }).then(function(obj) {
        var dialUps = JSON.parse(prefs.get(DIALUPS, '{}', '')),
            details = utils.getDetailsFromUrl(url);

        if(!dialUps.custom) {
          dialUps.custom = [];
        }

        /* before adding new dialup make sure it is not there already
        ** looks like concurrency issues of messaging framework could lead to race conditions
        */


        const isPresent = dialUps.custom.some(function(dialup) {
          return utils.tryEncodeURIComponent(validUrl) === utils.stripTrailingSlash(dialup.url);
        });

        if(isPresent) {
          throw "duplicate";
        } else {
          console.log(`valid url: ${validUrl}, original url: ${urlToAdd}`);
          var dialup = {
            url: utils.tryEncodeURIComponent(validUrl)
          };
          if(index !== null) {
            dialUps.custom.splice(index, 0, dialup);
          } else {
            dialUps.custom.push(dialup);
          }
          prefs.set(DIALUPS, JSON.stringify(dialUps), '');
          return new SpeedDial(validUrl, searchEngines, true);
        }
      }).catch(reason => ({ error: true, reason: typeof reason === 'object' ? reason.toString() : reason }));
    },

    /**
    * Parse speedDials
    * @method parseSpeedDials
    */
    parseSpeedDials() {
      return JSON.parse(prefs.get(DIALUPS, '{}', ''));
    },

    /**
    * Save speedDials
    * @method saveSpeedDials
    * @param dialUps object
    */
    saveSpeedDials(dialUps) {
      prefs.set(DIALUPS, JSON.stringify(dialUps), '');
    },

    /**
    * Revert history url
    * @method revertHistorySpeedDial
    * @param url string
    */
    revertHistorySpeedDial(url) {
      const dialUps = this.actions.parseSpeedDials();
      delete dialUps.history[utils.hash(url)];
      this.actions.saveSpeedDials(dialUps);
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
    /**
    * Get list with top & personalized news
    * @method getNews
    */
    getNews() {
      //disables the whole news block if required by the config
      if(!this.settings.freshTabNews) {
        return {
          version: -1,
          news: []
        };
      }

      return News.getNews().then(function(news) {
        News.init();

        var newsList = news.newsList || [];
        var topNewsVersion = news.topNewsVersion || 0;

        return {
          version: topNewsVersion,
          news: newsList.map( r => ({
            title: r.short_title || r.title,
            description: r.description,
            displayUrl: utils.getDetailsFromUrl(r.url).cleanHost || r.title,
            logo: utils.getLogoDetails(utils.getDetailsFromUrl(r.url)),
            url: r.url,
            type: r.type,
            breaking_label: r.breaking_label
          }))
        };
      });
    },

    /**
    * Get offers
    * @method getOffers
    */
    getOffers() {
      if(!this.showOffers) {
        return;
      }
      const args = {
        filters: {
          by_rs_dest: 'cliqz-tab',
          ensure_has_dest: true
        }
      };

      return this.offersV2.action('getStoredOffers', args);
    },

    /**
    * Get configuration regarding locale, onBoarding and browser
    * @method getConfig
    */
    getConfig() {
      let blueTheme = this.blueTheme;
      return {
        locale: utils.PREFERRED_LANGUAGE,
        newTabUrl: config.settings.NEW_TAB_URL,
        isBrowser: isCliqzBrowser,
        blueTheme: this.blueTheme,
        isBlueThemeSupported: this.isBlueThemeSupported,
        isBlueBackgroundSupported: this.isBlueBackgroundSupported,
        showNewBrandAlert: this.shouldShowNewBrandAlert,
        messages: this.messages,
        isHistoryEnabled: prefs.get('modules.history.enabled', false) && config.settings.HISTORY_URL,
        componentsState: this.getComponentsState(),
      };
    },

    /**
    * @method toggleBlueTheme
    */
    toggleBlueTheme() {
      // toggle blue class only on FF for testing.
      // Cliqz browser listens for pref change and takes care of toggling the class
      if (prefs.get(DEVELOPER_FLAG_PREF, false)) {
        this.actions.toggleBlueClassForFFTesting();
      }

      if(this.blueTheme) {
        prefs.set(BLUE_THEME_PREF, false);
      } else {
        prefs.set(BLUE_THEME_PREF, true);
      }
    },

    toggleBlueClassForFFTesting() {
      if (this.blueTheme) {
        this.theme.action('removeBlueClass');
      } else {
        this.theme.action('addBlueClass')
      }
    },

    /**
    * @method takeFullTour
    */
    takeFullTour() {
      var onboardingWindow = utils.getWindow().CLIQZ.System.get("onboarding/window").default;
      new onboardingWindow({settings: {}, window: utils.getWindow()}).fullTour();

      utils.telemetry({
        "type": "onboarding",
        "product": "cliqz",
        "action": "click",
        "action_target": "tour",
        "version": 1.0
      });
    },
    /**
    * revert back to old "new tab"
    * @method revertBack
    */
    revertBack() {
      this.newTabPage.rollback();
    },

    getTabIndex() {
      return Promise.resolve(utils.getWindow().gBrowser.tabContainer.selectedIndex);
    },

    shareLocation(decision) {
      events.pub('msg_center:hide_message', {'id': 'share-location' }, 'MESSAGE_HANDLER_FRESHTAB');
      this.geolocation.action('setLocationPermission', decision);

      const target = (decision === 'yes') ?
        'always_share' : 'never_share';

      utils.telemetry({
        type: 'notification',
        action: 'click',
        topic: 'share-location',
        context: 'home',
        target: target
      });
    },

    refreshFrontend() {
      forEachWindow(window => {
        const tabs = [...window.gBrowser.tabs];
        tabs.forEach(tab => {
          const browser = tab.linkedBrowser;
          if (browser.currentURI.spec === config.settings.NEW_TAB_URL) {
            browser.reload();
          }
        });
      });
    },

    refreshHistoryDependentPages() {
      forEachWindow(window => {
        const tabs = [...window.gBrowser.tabs];
        tabs.forEach(tab => {
          const browser = tab.linkedBrowser;
          if (isHistoryDependentPage(browser.currentURI.spec)) {
            browser.reload();
          }
        });
      });
    }

  },

  events: {
    "control-center:cliqz-tab": function () {
      if(this.newTabPage.isActive) {
        this.newTabPage.rollback();
        this.newTabPage.setPersistentState(false);
      } else {
        this.newTabPage.enableNewTabPage();
        this.newTabPage.enableHomePage();
      }
    },
    "message-center:handlers-freshtab:new-message": function onNewMessage(message) {
      if( !(message.id in this.messages )) {
        this.messages[message.id] = message;
        this.core.action(
          'broadcastMessage',
          config.settings.NEW_TAB_URL,
          {
            action: 'addMessage',
            message: message,
          }
        );
      }
    },
    "message-center:handlers-freshtab:clear-message": function onMessageClear(message) {
      delete this.messages[message.id];
      this.core.action(
        'broadcastMessage',
        config.settings.NEW_TAB_URL,
        {
          action: 'closeNotification',
          messageId: message.id,
        }
      );
    },
    "geolocation:wake-notification": function onWake(timestamp) {
      this.actions.getNews().then(() => {
        this.actions.refreshFrontend();
      });
    },
    "history:cleared": function onHistoryCleared() {
      this.actions.refreshHistoryDependentPages();
    },
    "history:removed": function onHistoryRemoved(urls) {
      const historyUrls = [...mapWindows(w => w).map(queryActiveTabs).reduce((aUrls, aTabs) => {
        return new Set([
          ...urls,
          ...aTabs.map(t => t.url),
        ]);
      }, new Set())]
      .filter(isHistoryDependentPage);

      historyUrls.forEach((url) => {
        this.core.action(
          'broadcastMessage',
           url,
          {
            action: 'updateHistoryUrls',
            message: { urls },
          }
        );
      });
    },
  },
});
