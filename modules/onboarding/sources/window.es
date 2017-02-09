import prefs from '../core/prefs';
import utils from "core/utils";
/**
* @namespace onboarding
*/
export default class {
  /**
  * opens tutorial page on first install or at reinstall if reinstall is done through onboarding
  * @class Window
  * @constructor
  */
  constructor(settings) {
    this.onInstall = prefs.get('new_session');
    this.window = settings.window;
    this._tutorialTimeout = null;
  }

  get version() { return  "1.1"; }
  /**
  * @method init
  */
  init() {
    if(!this.onInstall){
      return;
    } else {
      // avoid showing onboarding multiple times
      prefs.set('new_session', false);
      this.fullTour();
    }
  }
  /**
  * @method fullTour
  */
  fullTour() {
    var tutorialUrl, tutorialVersion;
    var showNewOnboarding = isVersionHigherThan("36.0");

    if (showNewOnboarding) {
      tutorialUrl = this.window.CLIQZ.System.baseURL+"onboarding/onboarding.html";
      tutorialVersion = this.version; //CliqzTour.VERSION;
    } else {
      tutorialUrl = CliqzUtils.TUTORIAL_URL;
      tutorialVersion = "0.0"
    }

    CliqzUtils.setPref('onboarding_versionShown', tutorialVersion);
    CliqzUtils.setPref('onboarding_finishedWatching', false);

    this._tutorialTimeout = CliqzUtils.setTimeout(function() {
      CliqzUtils.openTabInWindow(this.window, tutorialUrl, true);
    }.bind(this), 100);
  }

  unload() {
    CliqzUtils.clearTimeout(this._tutorialTimeout);
  }
};

function isVersionHigherThan(version) {
  try {
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
      .getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
     .getService(Components.interfaces.nsIVersionComparator);

    return versionChecker.compare(appInfo.version, version) >= 0;
  } catch (e) {
    CliqzUtils.log('error checking browser version: ' + e);
    return false;
  }
}
