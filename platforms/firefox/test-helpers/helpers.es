import { getCurrentWindow } from '../windows';
import { Services, Components } from '../globals';
import console from '../../core/console';

export const EventUtils = {};
if (typeof Services !== 'undefined') {
  Services.scriptloader.loadSubScriptWithOptions(
    'chrome://cliqz/content/core/EventUtils.js',
    { target: EventUtils, ignoreCache: true },
  );
}

export const TIP = (typeof Components !== 'undefined' ?
  Components.classes['@mozilla.org/text-input-processor;1']
    .createInstance(Components.interfaces.nsITextInputProcessor) : undefined);

export function press(opt) {
  const event = new KeyboardEvent('', {
    key: opt.key,
    code: opt.code || opt.key
  });

  TIP.beginInputTransaction(window, console.log);
  TIP.keydown(event);
}

// TODO: remove wrapper when all tests will land in single bundle
// it is only needed as we cannot acqure references to all object on loading time
export const wrap = getObj => new Proxy({}, {
  get(target, name) {
    // console.error('WRAPPER GET', target, name, getObj.toString());
    const obj = getObj();
    // console.error('OBJ', obj);
    let prop = obj[name];

    if (typeof prop === 'function') {
      prop = prop.bind(obj);
    }
    return prop;
  },
  set(target, name, value) {
    // console.error('WRAPPER SET', target, name, value, getObj.toString());
    const obj = getObj();
    obj[name] = value;
    return true;
  },
});

export const win = wrap(() => getCurrentWindow());
export const urlBar = wrap(() => win.CLIQZ.Core.urlbar);
export const popup = wrap(() => win.CLIQZ.Core.popup);
export const $dropdown = wrap(() => win.$dropdown);
export const CliqzUtils = wrap(() => win.CliqzUtils);
export const CliqzEvents = wrap(() => win.CliqzEvents);
export const app = wrap(() => win.CLIQZ.app);
export const getComputedStyle = (...args) => win.getComputedStyle(...args);
export const urlbar = wrap(() => win.gURLBar);

export const queryHTML = (url, selector, property) =>
  app.modules.core.action('queryHTML', url, selector, property);

export function blurUrlBar() {
  urlbar.mInputField.setUserInput('');
  urlbar.blur();
  urlbar.mInputField.blur();
  win.CLIQZ.UI.renderer.close();
}

export function getResourceUrl(module, resource) {
  return `resource://cliqz/${module}/${resource}`;
}

function clearSingleDB(dbName) {
  const req = win.indexedDB.deleteDatabase(dbName);
  return new Promise((resolve) => {
    req.onsuccess = resolve;
  });
}

export function clearDB(dbNames) {
  return Promise.all(dbNames.map(dbName => clearSingleDB(dbName)));
}

// TODO: add a helper to clear pref changes
// class PrefListener {
//   start() {
//
//   }
//
//   stop() {
//
//   }
//
//   restore() {
//
//   }
// }
