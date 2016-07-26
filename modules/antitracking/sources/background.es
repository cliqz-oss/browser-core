import CliqzPopupButton from 'antitracking/popup-button';
import CliqzAttrack from 'antitracking/attrack';
import { DEFAULT_ACTION_PREF, updateDefaultTrackerTxtRule } from 'antitracking/tracker-txt';
import { utils, events } from 'core/cliqz';

export default {

  init(settings) {
    this.buttonEnabled = utils.getPref('attrackUI', settings.antitrackingButton);

    // fix for users without pref properly set: set to value from build config
    if ( !utils.hasPref('attrackRemoveQueryStringTracking') ) {
      utils.setPref('attrackRemoveQueryStringTracking', settings.antitrackingButton);
    }

    this.enabled = false;

    utils.bindObjectFunctions( this.popupActions, this );

    if ( this.buttonEnabled ) {
      this.popup = new CliqzPopupButton({
        name: 'antitracking',
        actions: this.popupActions
      });
      this.popup.attach();
      this.popup.updateState(utils.getWindow(), false);
    }

    this.onPrefChange = function(pref) {
      if (pref === CliqzAttrack.ENABLE_PREF && CliqzAttrack.isEnabled() !== this.enabled) {
        let isEnabled = CliqzAttrack.isEnabled();

        if (isEnabled) {
          // now enabled, initialise module
          CliqzAttrack.init();
        } else {
          // disabled, unload module
          CliqzAttrack.unload();
        }

        if(this.popup){
          this.popup.updateState(utils.getWindow(), isEnabled);
          this.enabled = isEnabled;
        }
      } else if (pref === DEFAULT_ACTION_PREF) {
        updateDefaultTrackerTxtRule();
      }
    }.bind(this);

    this.onPrefChange(CliqzAttrack.ENABLE_PREF);
    events.sub('prefchange', this.onPrefChange);
  },

  unload() {
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
    getPopupData(args, cb) {
      var info = CliqzAttrack.getCurrentTabBlockingInfo();

      cb({
        url: info.hostname,
        cookiesCount: info.cookies.blocked,
        requestsCount: info.requests.unsafe,
        enabled: utils.getPref('antiTrackTest'),
        isWhitelisted: CliqzAttrack.isSourceWhitelisted(info.hostname),
        reload: info.reload || false,
        trakersList: info
      });
    },

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

    closePopup(_, cb) {
      this.popup.tbb.closePopup();
      cb();
    },

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
    updateHeight(args, cb) {
      this.popup.updateView(utils.getWindow(), args[0]);
    },

    telemetry(msg) {
      if ( msg.includeUnsafeCount ) {
        delete msg.includeUnsafeCount
        let info = CliqzAttrack.getCurrentTabBlockingInfo();
        msg.unsafe_count = info.cookies.blocked + info.requests.unsafe;
      }
      msg.type = 'antitracking';
      utils.telemetry(msg);
    }
  }
};
