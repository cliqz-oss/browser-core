/* globals ChromeUtils, Components */

const { ExtensionCommon } = ChromeUtils.import('resource://gre/modules/ExtensionCommon.jsm');
const { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');

const { EventManager } = ExtensionCommon;

const prefSvc = Services.prefs;
const COMPLEX_VALUE_RE = /^chrome:\/\/.+\/locale\/.+\.properties/;

export function getPref(prefName) {
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
}

export function hasPref(key) {
  return prefSvc.getPrefType(key) !== 0;
}

export function setPref(key, value) {
  switch (typeof value) {
    case 'boolean': prefSvc.setBoolPref(key, value); break;
    case 'number': prefSvc.setIntPref(key, value); break;
    case 'string': prefSvc.setCharPref(key, value); break;
    default: Services.console.logStringMessage(`WARNING: Unable to save "${key}"`); break;
  }
}

export function prefObserver(context) {
  return new EventManager({
    context,
    name: 'cliqz.onPrefChange',
    inputHandling: false,
    register: (fire, prefix, key = null) => {
      let prefBranch;
      let prefName;
      const observer = {
        observe: () => fire.async()
      };

      if (key) {
        prefBranch = prefSvc.getBranch('');
        prefName = `${prefix}${key}`;
      } else {
        prefBranch = prefSvc.getBranch(prefix);
        prefName = '';
      }

      prefBranch.addObserver(prefName, observer, false);

      return () => {
        // this will be fired on removeListner
        prefBranch.removeObserver(prefName, observer, false);
      };
    }
  }).api();
}
