import { getCurrentWindow } from '../windows';
import { Services, Components } from '../globals';
import console from '../../core/console';
import { getCurrentgBrowser } from '../tabs';
import { waitFor } from '../../core/helpers/wait';


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
  let modifierEvent;

  const event = new KeyboardEvent('', {
    key: opt.key,
    code: opt.code || opt.key
  });

  TIP.beginInputTransaction(window, console.log);

  if (opt.ctrlKey) {
    modifierEvent = new KeyboardEvent('', {
      key: 'Control',
      code: 'ControlLeft'
    });
    TIP.keydown(modifierEvent);
  }

  if (opt.shiftKey) {
    modifierEvent = new KeyboardEvent('', {
      key: 'Shift',
      code: 'ShiftLeft'
    });
    TIP.keydown(modifierEvent);
  }

  if (opt.altKey) {
    modifierEvent = new KeyboardEvent('', {
      key: 'Alt',
      code: 'AltLeft'
    });
    TIP.keydown(modifierEvent);
  }

  if (opt.metaKey) {
    modifierEvent = new KeyboardEvent('', {
      key: 'Meta',
      code: 'MetaLeft'
    });
    TIP.keydown(modifierEvent);
  }

  TIP.keydown(event);
}

export function release(opt) {
  const event = new KeyboardEvent('', {
    key: opt.key,
    code: opt.code || opt.key,
    ctrlKey: opt.ctrlKey || false,
    shiftKey: opt.shiftKey || false,
    altKey: opt.altKey || false,
    metaKey: opt.metaKey || false
  });
  TIP.beginInputTransaction(window, console.log);
  TIP.keyup(event);
}

// TODO: remove wrapper when all tests will land in single bundle
// it is only needed as we cannot acqure references to all object on loading time
export const wrap = getObj => new Proxy({}, {
  get(target, name) {
    const obj = getObj();
    let prop = obj[name];

    if (typeof prop === 'function') {
      prop = prop.bind(obj);
    }
    return prop;
  },
  set(target, name, value) {
    const obj = getObj();
    obj[name] = value;
    return true;
  },
});

export const win = wrap(() => getCurrentWindow());
export const CLIQZ = wrap(() => win.CLIQZ);
export const urlBar = wrap(() => win.CLIQZ.Core.urlbar);
export const popup = wrap(() => win.CLIQZ.Core.popup);
export const $dropdown = wrap(() => win.$dropdown);
export const CliqzUtils = wrap(() => win.CliqzUtils);
export const CliqzEvents = wrap(() => win.CliqzEvents);
export const CliqzABTests = wrap(() => win.CliqzABTests);
export const app = wrap(() => win.CLIQZ.app);
export const getComputedStyle = (...args) => win.getComputedStyle(...args);
export const urlbar = wrap(() => win.gURLBar);
export const testServer = wrap(() => win.CLIQZ.TestHelpers.testServer);

export const click = (url, selector) =>
  app.modules.core.action('click', url, selector);

export const queryComputedStyle = (url, selector) =>
  app.modules.core.action('queryComputedStyle', url, selector);

export const queryHTML = (url, selector, property) =>
  app.modules.core.action('queryHTML', url, selector, property);

export async function focusOnTab(tabId) {
  const gBrowser = getCurrentgBrowser();
  const index = [...gBrowser.tabs].findIndex(t => t.linkedBrowser.outerWindowID === tabId);

  await waitFor(() => {
    // gBrowser.selectTabAtIndex(index);
    gBrowser.tabs[index].click();
    return getCurrentgBrowser().tabs[index].selected;
  });
}

export function blurUrlBar() {
  urlbar.mInputField.setUserInput('');
  urlbar.blur();
  urlbar.mInputField.blur();
  win.CLIQZ.UI.renderer.close();
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
