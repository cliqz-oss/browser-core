import FreshTab from 'freshtab/main';
import News from 'freshtab/news';
import History from 'freshtab/history';
import { utils, events } from 'core/cliqz';
import SpeedDial from 'freshtab/speed-dial';
import { version as onboardingVersion, shouldShowOnboardingV2 } from "core/onboarding";
import { AdultDomain } from 'core/adult-domain';
import background from 'core/base/background';
import { forEachWindow } from 'core/browser';


const DIALUPS = 'extensions.cliqzLocal.freshtab.speedDials';
const DISMISSED_ALERTS = 'dismissedAlerts';
const ONE_DAY = 24 * 60 * 60 * 1000;
const FIVE_DAYS = 5 * ONE_DAY;
const PREF_ONBOARDING = 'freshtabOnboarding';

const getInstallationDate = function() {
  return parseInt(utils.getPref(PREF_ONBOARDING, '0'));
}

const isWithinNDaysAfterInstallation = function(days) {
  return getInstallationDate() + ONE_DAY * days > Date.now();
}

/**
* @namespace freshtab
* @class Background
*/
export default background({
  /**
  * @method init
  */
  init(settings) {
    FreshTab.startup(
      settings.freshTabButton,
      settings.cliqzOnboarding,
      settings.channel,
      settings.showNewBrandAlert,
      settings.freshTabInitialState);

    this.adultDomainChecker = new AdultDomain();
    this.settings = settings;
    this.messages = {};
  },
  /**
  * @method unload
  */
  unload() {
    News.unload();
    FreshTab.shutdown();
  },

  isAdult(url) {
    return this.adultDomainChecker.isAdult(utils.getDetailsFromUrl(url).domain);
  },

  actions: {
    _showOnboarding() {
      if (onboardingVersion() === '2.1') {
        shouldShowOnboardingV2().then((show) => {
          if (show) {
            utils.openLink(utils.getWindow(), utils.CLIQZ_ONBOARDING);
            return;
          }
        });
      }
    },
    _showHelp: isWithinNDaysAfterInstallation.bind(null, 5),

    _showMiniOnboarding() {

      if (getInstallationDate() === 0) {
        utils.setPref(PREF_ONBOARDING, '' + Date.now());
      }

      return isWithinNDaysAfterInstallation(1);
    },

    _isBrowser() {
      return FreshTab.isBrowser;
    },
    _showFeedback() {
      const showFeedback = utils.getPref('freshtabFeedback', false);
      return showFeedback;
    },
    _showNewBrandAlert() {
      const isInABTest = utils.getPref('freshtabNewBrand', false);
      const isDismissed = utils.getPref('freshtabNewBrandDismissed', false);
      return FreshTab.showNewBrandAlert && isInABTest && !isDismissed;
    },
    dismissMessage(messageId) {
      try {
        const dismissedAlerts = JSON.parse(utils.getPref(DISMISSED_ALERTS, '{}'));

        if(!dismissedAlerts[messageId]) {
          dismissedAlerts[messageId] = {
            'scope': 'freshtab',
            'count': 0
          }
        }
        dismissedAlerts[messageId]['count']++;
        utils.setPref(DISMISSED_ALERTS, JSON.stringify(dismissedAlerts));
        events.pub('msg_center:hide_message', { id: messageId }, 'MESSAGE_HANDLER_FRESHTAB');
        utils.telemetry({
          type: 'notification',
          topic: 'share-location',
          context: 'home',
          action: 'click',
          target: 'hide'
        });

      } catch (e) {
        utils.log(e, `Freshtab error setting ${message.id} dismiss pref`)
      }
    },

    /**
    * Get history based & user defined speedDials
    * @method getSpeedDials
    */
    getSpeedDials() {
      var dialUps = utils.hasPref(DIALUPS, '') ? JSON.parse(utils.getPref(DIALUPS, '', '')) : [],
          historyDialups = [],
          customDialups = dialUps.custom ? dialUps.custom : [];

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

        results = dialUps.length === 0 ? results : results.filter(history => {
          return !isDeleted(history.hashedUrl) && !isCustom(history.url) && !this.isAdult(history.url);
        });

        return results.map(function(r){
          return new SpeedDial(r.url, false);
        });
      });



      if(customDialups.length > 0) {
        utils.log(customDialups, "custom dialups");
        customDialups = customDialups.map(function(dialup) {
          return new SpeedDial(utils.tryDecodeURIComponent(dialup.url), true);
        });
      }


      //Promise all concatenate results and return
      return Promise.all([historyDialups, customDialups]).then(function(results){
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
      const dialUps = JSON.parse(utils.getPref(DIALUPS, '{}', ''));

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

      utils.setPref(DIALUPS, JSON.stringify(dialUps), '');
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

      //history returns most frequest 15 results, but we display up to 5
      //so we need to validate only against visible results
      return this.actions.getVisibleDials(5).then((result) => {
        const isDuplicate = result.some(function(dialup) {
          return urlToAdd === utils.stripTrailingSlash(dialup.url);
        });

        if(isDuplicate) {
          throw "duplicate";
        }
      }).then(function(obj) {
        var dialUps = JSON.parse(utils.getPref(DIALUPS, '{}', '')),
            details = utils.getDetailsFromUrl(url);

        if(!dialUps.custom) {
          dialUps.custom = [];
        }

        /* before adding new dialup make sure it is not there already
        ** looks like concurrency issues of messaging framework could lead to race conditions
        */


        const isPresent = dialUps.custom.some(function(dialup) {
          return utils.tryEncodeURIComponent(urlToAdd) === utils.stripTrailingSlash(dialup.url);
        });

        if(isPresent) {
          throw "duplicate";
        } else {
          var dialup = {
            url: utils.tryEncodeURIComponent(urlToAdd)
          };
          if(index !== null) {
            dialUps.custom.splice(index, 0, dialup);
          } else {
            dialUps.custom.push(dialup);
          }
          utils.setPref(DIALUPS, JSON.stringify(dialUps), '');
          return new SpeedDial(urlToAdd, true);
        }
      }).catch(reason => ({ error: true, reason: typeof reason === 'object' ? reason.toString() : reason }));
    },

    /**
    * Parse speedDials
    * @method parseSpeedDials
    */
    parseSpeedDials() {
      return JSON.parse(utils.getPref(DIALUPS, '{}', ''));
    },

    /**
    * Save speedDials
    * @method saveSpeedDials
    * @param dialUps object
    */
    saveSpeedDials(dialUps) {
      utils.setPref(DIALUPS, JSON.stringify(dialUps), '');
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
    * Get configuration regarding locale, onBoarding and browser
    * @method getConfig
    */
    getConfig() {
      var self = this;

      var config = {
        locale: utils.PREFERRED_LANGUAGE,
        showOnboarding: self.actions._showOnboarding(),
        miniOnboarding: self.actions._showMiniOnboarding(),
        showHelp: self.actions._showHelp(),
        isBrowser: self.actions._isBrowser(),
        showFeedback: self.actions._showFeedback(),
        showNewBrandAlert: self.actions._showNewBrandAlert(),
        messages: this.messages
      };
      return Promise.resolve(config);
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
      FreshTab.toggleState();
    },

    getTabIndex() {
      return Promise.resolve(utils.getWindow().gBrowser.tabContainer.selectedIndex);
    },

    shareLocation(decision) {
      events.pub('msg_center:hide_message', {'id': 'share-location' }, 'MESSAGE_HANDLER_FRESHTAB');
      utils.callAction('geolocation', 'setLocationPermission', [decision]);

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
          if (browser.currentURI.spec === 'about:cliqz') {
            browser.reload();
          }
        });
      })
    }

  },

  events: {
    "control-center:cliqz-tab": function () {
      FreshTab.toggleState();
    },
    "message-center:handlers-freshtab:new-message": function onNewMessage(message) {
      if( !(message.id in this.messages )) {
        this.messages[message.id] = message;
        utils.callAction('core', 'broadcastMessage', [
          utils.CLIQZ_NEW_TAB_URL + '?cliqzOnboarding=1',
          {
            action: 'addMessage',
            message: message,
          }
        ]);
      }
    },
    "message-center:handlers-freshtab:clear-message": function onMessageClear(message) {

      delete this.messages[message.id];
      utils.callAction('core', 'broadcastMessage', [
        utils.CLIQZ_NEW_TAB_URL + '?cliqzOnboarding=1',
        {
          action: 'closeNotification',
          messageId: message.id,
        }
      ]);
    },
    "geolocation:wake-notification": function onWake(timestamp) {
      this.actions.getNews().then(() => {
        this.actions.refreshFrontend();
      });
    },
  },
});
