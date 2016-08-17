import background from "core/base/background";
import CliqzPopupButton from 'antitracking/popup-button';
import CliqzAttrack from 'antitracking/attrack';
import {PrivacyScore} from 'antitracking/privacy-score';
import md5 from 'antitracking/md5';
import { DEFAULT_ACTION_PREF, updateDefaultTrackerTxtRule } from 'antitracking/tracker-txt';
import { utils, events } from 'core/cliqz';
import telemetry from 'antitracking/telemetry';

/**
* @namespace antitracking
* @class Background
*/
export default background({
  /**
  * @method init
  * @param settings
  */
  init(settings) {
    if (CliqzAttrack.getBrowserMajorVersion() < CliqzAttrack.MIN_BROWSER_VERSION) {
      return;
    }

    this.buttonEnabled = utils.getPref('attrackUI', settings.antitrackingButton);

    // fix for users without pref properly set: set to value from build config
    if (!utils.hasPref('attrackRemoveQueryStringTracking')) {
      utils.setPref('attrackRemoveQueryStringTracking', settings.antitrackingButton);
    }

    this.enabled = false;
    this.clickCache = {};

    utils.bindObjectFunctions( this.popupActions, this );

    if (this.buttonEnabled) {
      this.popup = new CliqzPopupButton({
        name: 'antitracking',
        actions: this.popupActions
      });
      this.popup.attach();
      this.popup.updateState(utils.getWindow(), false);
    }

    // inject configured telemetry module
    telemetry.loadFromProvider(settings.telemetryProvider || 'human-web/human-web');

    this.onPrefChange = function(pref) {
      if (pref === CliqzAttrack.ENABLE_PREF && CliqzAttrack.isEnabled() !== this.enabled) {
        const isEnabled = CliqzAttrack.isEnabled();

        if (isEnabled) {
          // now enabled, initialise module
          CliqzAttrack.init();
        } else {
          // disabled, unload module
          CliqzAttrack.unload();
        }

        if(this.popup){
          this.popup.updateState(utils.getWindow(), isEnabled);
        }
        this.enabled = isEnabled;
      } else if (pref === DEFAULT_ACTION_PREF) {
        updateDefaultTrackerTxtRule();
      }
    }.bind(this);

    this.onPrefChange(CliqzAttrack.ENABLE_PREF);
    events.sub('prefchange', this.onPrefChange);
  },

  enabled() {
    return this.enabled;
  },

  /**
  * @method unload
  */
  unload() {
    if (CliqzAttrack.getBrowserMajorVersion() < CliqzAttrack.MIN_BROWSER_VERSION) {
      return;
    }

    if ( this.popup ) {
      this.popup.destroy();
    }

    events.un_sub('prefchange', this.onPrefChange);

    if (CliqzAttrack.isEnabled()) {
      CliqzAttrack.unload();
      this.enabled = false;
    }
  },

  popupActions: {
    /**
    * @method popupActions.getPopupData
    * @param args
    * @param cb Callback
    */
    getPopupData(args, cb) {

      var info = CliqzAttrack.getCurrentTabBlockingInfo(),
          ps = info.ps;
      // var ps = PrivacyScore.get(md5(info.hostname).substring(0, 16)  'site');

      // ps.getPrivacyScore();

      cb({
        url: info.hostname,
        cookiesCount: info.cookies.blocked,
        requestsCount: info.requests.unsafe,
        enabled: utils.getPref('antiTrackTest'),
        isWhitelisted: CliqzAttrack.isSourceWhitelisted(info.hostname),
        reload: info.reload || false,
        trakersList: info,
        ps: ps
      });

      if (this.popup) {
        this.popup.setBadge(utils.getWindow(), info.cookies.blocked + info.requests.unsafe);
      }
    },
    /**
    * @method popupActions.toggleAttrack
    * @param args
    * @param cb Callback
    */
    toggleAttrack(args, cb) {
      var currentState = utils.getPref('antiTrackTest');

      if (currentState) {
        CliqzAttrack.disableModule();
      } else {
        CliqzAttrack.enableModule();
      }

      this.popup.updateState(utils.getWindow(), !currentState);

      cb();

      this.popupActions.telemetry( {action: 'click', 'target': (currentState ? 'deactivate' : 'activate')} )
    },
    /**
    * @method popupActions.closePopup
    */
    closePopup(_, cb) {
      this.popup.tbb.closePopup();
      cb();
    },
    /**
    * @method popupActions.toggleWhiteList
    * @param args
    * @param cb Callback
    */
    toggleWhiteList(args, cb) {
      var hostname = args.hostname;
      if (CliqzAttrack.isSourceWhitelisted(hostname)) {
        CliqzAttrack.removeSourceDomainFromWhitelist(hostname);
        this.popupActions.telemetry( { action: 'click', target: 'unwhitelist_domain'} );
      } else {
        CliqzAttrack.addSourceDomainToWhitelist(hostname);
        this.popupActions.telemetry( { action: 'click', target: 'whitelist_domain'} );
      }
      cb();
    },
    /**
    * @method popupActions.updateHeight
    * @param args
    * @param cb Callback
    */
    updateHeight(args, cb) {
      this.popup.updateView(utils.getWindow(), args[0]);
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
        const info = CliqzAttrack.getCurrentTabBlockingInfo();
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
    "core.tab_location_change": CliqzAttrack.onTabLocationChange,
    "core.tab_state_change": CliqzAttrack.tab_listener.onStateChange.bind(CliqzAttrack.tab_listener)
  },

});
