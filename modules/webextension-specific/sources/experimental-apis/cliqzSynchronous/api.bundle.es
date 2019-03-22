/* globals ExtensionAPI, ChromeUtils */
const { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');

const prefSvc = Services.prefs;
const COMPLEX_VALUE_RE = /^chrome:\/\/.+\/locale\/.+\.properties/;

const getPref = (prefName) => {
  let value = null;
  try {
    switch (prefSvc.getPrefType(prefName)) {
      case prefSvc.PREF_BOOL:
        value = prefSvc.getBoolPref(prefName);
        break;
      case prefSvc.PREF_STRING: {
        let charVal = prefSvc.getCharPref(prefName);
        // it might be a complex value
        if (COMPLEX_VALUE_RE.test(charVal)) {
          try {
            charVal = prefSvc.getComplexValue(
              prefName,
              Components.interfaces.nsIPrefLocalizedString,
            ).data;
          } catch (e) {
            break;
          }
        }
        value = charVal;
        break;
      }
      case prefSvc.PREF_INT:
        value = prefSvc.getIntPref(prefName);
        break;
      case prefSvc.PREF_INVALID:
      default:
        break;
    }
  } catch (e) {
    // nothing
  }
  return value;
};

const hasPref = key => prefSvc.getPrefType(key) !== 0;

const isDefaultBrowser = () => {
  try {
    const shell = Components.classes['@mozilla.org/browser/shell-service;1']
      .getService(Components.interfaces.nsIShellService);
    if (shell) {
      return shell.isDefaultBrowser(false);
    }
  } catch (e) {
    // empty
  }

  return null;
};


global.cliqzSynchronous = class extends ExtensionAPI {
  getAPI() {
    return {
      cliqzSynchronous: {
        getPref,
        hasPref,
        isDefaultBrowser
      }
    };
  }
};
