import CliqzUtils from "core/utils";
import CliqzABTests from "core/ab-tests";
import Factory from '../platform/component-registration';
import AboutCliqz from './about-cliqz-protocol-handler';
const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu } =
    Components;

var CLIQZ_NEW_TAB = CliqzUtils.CLIQZ_NEW_TAB,
    CLIQZ_NEW_TAB_RESOURCE_URL = CliqzUtils.CLIQZ_NEW_TAB_RESOURCE_URL,
    DEF_HOMEPAGE = "browser.startup.homepage",
    DEF_NEWTAB = "browser.newtab.url",
    DEF_STARTUP = "browser.startup.page",
    CLIQZ_STARTUP_PREF = 1, //http://kb.mozillazine.org/Browser.startup.page
    BAK_HOMEPAGE = "backup.homepage",
    BAK_NEWTAB = "backup.newtab",
    BAK_STARTUP = "backup.startup",
    FRESH_TAB_STATE = "freshTabState", // true = active
    FRESH_TAB_BACKUP_DONE = "freshTabBackupDone", // true = active
    OLD_FRESH_TAB = "freshtabdone",
    HAS_BUTTON = true,
    FF41_OR_ABOVE = false;

const StringInputStream = CC(
  '@mozilla.org/io/string-input-stream;1',
  'nsIStringInputStream',
  'setData');
const InputStreamChannel = Cc["@mozilla.org/network/input-stream-channel;1"];
const securityManager = Cc["@mozilla.org/scriptsecuritymanager;1"].getService(
    Ci.nsIScriptSecurityManager);

try{
  var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
      .getService(Components.interfaces.nsIXULAppInfo);
  var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
      .getService(Components.interfaces.nsIVersionComparator);

  if(versionChecker.compare(appInfo.version, "41.0") >= 0){
    FF41_OR_ABOVE = true;
    if(versionChecker.compare(appInfo.version, "44.0") < 0){
      Cu.import("resource:///modules/NewTabURL.jsm");
    } else {
      const aboutNewTabService = Cc['@mozilla.org/browser/aboutnewtab-service;1'].getService(Ci.nsIAboutNewTabService);
    }
  }
} catch(e){}


var FreshTab = {
    signalType: "home",
    initialized: false,
    isBrowser: false,
    freshTabState: FRESH_TAB_STATE,

    startup: function(hasButton, channel, showNewBrandAlert, initialState){
        var disable = false;

        FreshTab.showNewBrandAlert = showNewBrandAlert;
        HAS_BUTTON = hasButton;

        FreshTab.isBrowser = channel === "40";

        // disable the AB test if the user doesnt have FF41 or above
        if(!FF41_OR_ABOVE){
          CliqzABTests.disable("1065_B");
          disable = true;
        }

        if(disable){
          //in case 'about:cliqz' remained set as default homepage - reset it
          if(CliqzUtils.getPref(DEF_HOMEPAGE, null, '') == CLIQZ_NEW_TAB){
            //in case we did a backup - use it
            if(CliqzUtils.hasPref(BAK_HOMEPAGE)){
              CliqzUtils.setPref(DEF_HOMEPAGE, CliqzUtils.getPref(BAK_HOMEPAGE), '');
            } else {
              //otherwise simply reset
              CliqzUtils.clearPref(DEF_HOMEPAGE, '');
            }
          }
          return;
        }

        // first start
        if(HAS_BUTTON && !CliqzUtils.hasPref(FRESH_TAB_STATE)){
          CliqzUtils.setPref(FRESH_TAB_STATE,  initialState);
        }

        this.aboutCliqzComponent = new Factory(AboutCliqz);
        this.aboutCliqzComponent.register();

        // reset preferences in case of inconsistency
        if(CliqzUtils.hasPref(OLD_FRESH_TAB) || //  old FreshTab settings
           (CliqzUtils.hasPref(BAK_HOMEPAGE) && CliqzUtils.getPref(BAK_HOMEPAGE) == CLIQZ_NEW_TAB)  // inconsistency
          ){

          CliqzUtils.clearPref(OLD_FRESH_TAB);
          CliqzUtils.clearPref(DEF_HOMEPAGE, '');
          CliqzUtils.clearPref(DEF_NEWTAB, '');
          CliqzUtils.clearPref(DEF_STARTUP, '');
          CliqzUtils.clearPref(BAK_HOMEPAGE);
          CliqzUtils.clearPref(BAK_NEWTAB);
          CliqzUtils.clearPref(BAK_STARTUP);
          CliqzUtils.clearPref(FRESH_TAB_BACKUP_DONE);
        }

        FreshTab.updateState();
        FreshTab.initialized = true;
    },

    shutdown: function(){
        if(!FreshTab.initialized) return;

        this.aboutCliqzComponent.unregister();

        deactivate();
    },
    toggleState: function(){
      CliqzUtils.setPref(FRESH_TAB_STATE, !CliqzUtils.getPref(FRESH_TAB_STATE));
      FreshTab.updateState();
    },
    updateState: function(){
      if(this.isActive()){
        activate();
      } else {
        deactivate();
      }
    },
    isActive() {
      return !HAS_BUTTON || CliqzUtils.getPref(FRESH_TAB_STATE);
    }
}

function activate(){
  // save the backup state only once
  var firstStart = false;
  if(!CliqzUtils.hasPref(FRESH_TAB_BACKUP_DONE)){
    CliqzUtils.setPref(FRESH_TAB_BACKUP_DONE, true);
    firstStart = true
  }

  if(FF41_OR_ABOVE){
      // newtab.url needs to be changed in the browser itself in FF 41
      // https://dxr.mozilla.org/mozilla-central/source/browser/modules/NewTabURL.jsm
      if(firstStart){
        CliqzUtils.setPref(BAK_STARTUP, CliqzUtils.getPref(DEF_STARTUP, null, ''));
        CliqzUtils.setPref(DEF_STARTUP, CLIQZ_STARTUP_PREF, ''); // set the startup page to be the homepage
      }

      if(versionChecker.compare(appInfo.version, "44.0") < 0){
        NewTabURL.override(CLIQZ_NEW_TAB_RESOURCE_URL);
      } else {
        const aboutNewTabService = Cc['@mozilla.org/browser/aboutnewtab-service;1'].getService(Ci.nsIAboutNewTabService);
        aboutNewTabService.newTabURL = CLIQZ_NEW_TAB_RESOURCE_URL;
      }
  } else { //FF 40 or older
      if(firstStart) CliqzUtils.setPref(BAK_NEWTAB, CliqzUtils.getPref(DEF_NEWTAB, null, ''));
      CliqzUtils.setPref(DEF_NEWTAB, CLIQZ_NEW_TAB_RESOURCE_URL, '');
  }

  if(firstStart){
    CliqzUtils.setPref(BAK_HOMEPAGE, CliqzUtils.getPref(DEF_HOMEPAGE, null, ''));
    CliqzUtils.setPref(DEF_HOMEPAGE, CLIQZ_NEW_TAB, '');
  }
}

function deactivate(){
  if(!CliqzUtils.hasPref(FRESH_TAB_BACKUP_DONE)) return;

  CliqzUtils.setPref(DEF_HOMEPAGE, CliqzUtils.getPref(BAK_HOMEPAGE), '');
  if(FF41_OR_ABOVE){ // FF41+
      if(versionChecker.compare(appInfo.version, "44.0") < 0){
        NewTabURL.reset();
      } else {
        const aboutNewTabService = Cc['@mozilla.org/browser/aboutnewtab-service;1'].getService(Ci.nsIAboutNewTabService);
        aboutNewTabService.resetNewTabURL();
      }

      if(CliqzUtils.getPref(DEF_STARTUP, '', '') == CLIQZ_STARTUP_PREF){
        // reset the startup page if the user didnt change it
        CliqzUtils.setPref(DEF_STARTUP, CliqzUtils.getPref(BAK_STARTUP), '');
      }
  }
  else {//FF40 and older
      CliqzUtils.setPref(DEF_NEWTAB, CliqzUtils.getPref(BAK_NEWTAB), '');
  }
}

export default FreshTab;
