/* globals ChromeUtils, EventManager  */

ChromeUtils.import('resource://gre/modules/Services.jsm');

const prefSvc = Services.prefs;

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
