//opens tutorial page on first install or at reinstall if reinstall is done through onboarding
export default class {

  constructor(settings) {
    this.onInstall = settings.onInstall;
    this.window = settings.window;
    this._tutorialTimeout = null;
    this.cliqzOnboarding = settings.settings.cliqzOnboarding;
  }

  get version() { return  "1.1"; }

  init() {
    if(this.cliqzOnboarding || !this.onInstall){
      return;
    } else {
      this.fullTour();
    }
  }

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
