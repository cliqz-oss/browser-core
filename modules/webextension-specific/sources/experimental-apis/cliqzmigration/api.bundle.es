/* globals ChromeUtils, ExtensionAPI, FileUtils */
ChromeUtils.import('resource://gre/modules/ExtensionCommon.jsm');
ChromeUtils.import('resource://gre/modules/FileUtils.jsm');
ChromeUtils.import('resource://gre/modules/Services.jsm');

const FILES_AND_FOLDERS = [
  // cliqz folders
  'cliqz',
  'cliqz-thumbnails',
  // database files
  'cliqz.dbattrack',
  'cliqz.dbhumanweb',
  'cliqz.dbusafe',
];

const PREFS_BRANCHES = {
  'extensions.cliqz.': '',
  'extensions.cliqzLocal.': 'extensions.cliqzLocal.',
  'extensions.cliqz-lang.': 'extensions.cliqz-lang.',
};

const prefSvc = Services.prefs;

const COMPLEX_VALUE_RE = /^chrome:\/\/.+\/locale\/.+\.properties/;

function getPref(prefName) {
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
              Components.interfaces.nsIPrefLocalizedString
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

function getPrefs() {
  const prefs = Object.create(null);
  Object.keys(PREFS_BRANCHES).forEach((branchName) => {
    const resultPrefix = PREFS_BRANCHES[branchName];
    prefSvc.getBranch(branchName).getChildList('').forEach((prefName) => {
      const value = getPref(`${branchName}${prefName}`);
      if (value !== null) {
        prefs[`${resultPrefix}${prefName}`] = value;
      }
    });
  });
  return prefs;
}

// purge all our data stored as a bootstrapped extension
function purge() {
  // remove prefs branches
  Object.keys(PREFS_BRANCHES).forEach((branchName) => {
    prefSvc.getBranch(branchName)
      .getChildList('')
      .forEach(prefName => prefSvc.clearUserPref(`${branchName}${prefName}`));
  });

  // remove folders and databases
  FILES_AND_FOLDERS.forEach((folderName) => {
    const file = FileUtils.getDir('ProfD', [folderName]);
    if (file.exists()) {
      file.remove(file.isDirectory());
    }
  });
}

global.cliqzmigration = class extends ExtensionAPI {
  getAPI() {
    return {
      cliqzmigration: {
        getPrefs,
        purge,
      }
    };
  }
};
