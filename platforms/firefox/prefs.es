import { Services, Components } from './globals';
import console from './console';

const prefs = typeof Services !== 'undefined' ? Services.prefs.getBranch('') : undefined;
const complexRegEx = /^chrome:\/\/.+\/locale\/.+\.properties/;

function prefixPref(pref, prefix = 'extensions.cliqz.') {
  return `${prefix}${pref}`;
}
export function getAllCliqzPrefs() {
  return Components.classes['@mozilla.org/preferences-service;1']
    .getService(Components.interfaces.nsIPrefService)
    .getBranch('extensions.cliqz.')
    .getChildList('');
}

export function getPref(key, defaultValue, prefix) {
  const pref = prefixPref(key, prefix);
  try {
    switch (prefs.getPrefType(pref)) {
      case 128: return prefs.getBoolPref(pref);
      case 32: {
        let charVal = prefs.getCharPref(pref);

        // it might be a complex value
        if (complexRegEx.test(charVal)) {
          try {
            charVal = prefs.getComplexValue(
              pref,
              Components.interfaces.nsIPrefLocalizedString
            ).data;
          } catch (e) {
            console.log(`Error fetching pref: ${pref}`);
          }
        }

        return charVal;
      }
      case 64: return prefs.getIntPref(pref);
      default: return defaultValue;
    }
  } catch (e) {
    return defaultValue;
  }
}

export function setPref(key, value, prefix) {
  const pref = prefixPref(key, prefix);

  switch (typeof value) {
    case 'boolean': prefs.setBoolPref(pref, value); break;
    case 'number': prefs.setIntPref(pref, value); break;
    case 'string': prefs.setCharPref(pref, value); break;
    default: Services.console.logStringMessage(`WARNING: Unable to save "${pref}`); break;
  }
}

export function hasPref(key, prefix) {
  const pref = prefixPref(key, prefix);
  return prefs.getPrefType(pref) !== 0;
}

export function clearPref(key, prefix) {
  const pref = prefixPref(key, prefix);
  prefs.clearUserPref(pref);
}

export function init() {
  return Promise.resolve();
}
