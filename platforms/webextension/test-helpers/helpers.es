import { chrome } from '../globals';

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


const chromeQueryHtml = async (url, selector, attribute, {
  attributeType = 'property',
} = {}) => {
  const window = chrome.extension.getViews().find(w => w.location.href === url);

  if (!window) {
    return [];
  }

  const attributes = attribute.split(',');
  const getAttr = (el, attr) => {
    if (attributeType === 'property') {
      return el[attr];
    }

    return el.getAttribute(attr);
  };

  return Array.prototype.map.call(
    window.document.querySelectorAll(selector),
    (el) => {
      if (attributes.length > 1) {
        return attributes.reduce((hash, attr) => ({
          ...hash,
          [attr]: getAttr(el, attr),
        }), {});
      }

      return getAttr(el, attribute);
    },
  );
};

const chromeQueryComputedStyle = async (url, selector) => {
  const window = chrome.extension.getViews().find(w => w.location.href === url);

  if (!window) {
    return [];
  }

  return Array.prototype.map.call(
    window.document.querySelectorAll(selector),
    el => window.getComputedStyle(el),
  );
};

const chromeClick = async (url, selector, ind) => {
  const window = chrome.extension.getViews().find(w => w.location.href === url);

  if (!window) {
    return [];
  }

  return window.document.querySelectorAll(selector)[ind].click();
};

export const win = wrap(() => chrome.extension.getBackgroundPage().window);
export const CLIQZ = wrap(() => win.CLIQZ);
export const app = wrap(() => win.CLIQZ.app);

const contentQueryHTML = async (...args) => {
  const response = await app.modules.core.action('queryHTML', ...args);
  return response;
};

const contentQueryComputedStyle = async (...args) => {
  const response = await app.modules.core.action('queryComputedStyle', ...args);
  return response;
};

export function queryHTML(url, ...rest) {
  if (url.startsWith(chrome.runtime.getURL(''))) {
    return chromeQueryHtml(url, ...rest);
  }
  return contentQueryHTML(url, ...rest);
}

export function queryComputedStyle(url, ...rest) {
  if (url.startsWith(chrome.runtime.getURL(''))) {
    return chromeQueryComputedStyle(url, ...rest);
  }
  return contentQueryComputedStyle(url, ...rest);
}

const contentClick = (url, selector) => app.modules.core.action('click', url, selector);

export function click(url, selector, ind = 0) {
  if (url.startsWith(chrome.runtime.getURL(''))) {
    return chromeClick(url, selector, ind);
  }
  return contentClick(url, selector);
}
export function press() {}

export function release() {}

export const urlBar = wrap(() => { throw new Error('Not implemented'); });
export const lang = wrap(() => { throw new Error('Not implemented'); });
export const popup = wrap(() => { throw new Error('Not implemented'); });
export const $dropdown = wrap(() => { throw new Error('Not implemented'); });
export const CliqzUtils = wrap(() => win.CliqzUtils);
export const CliqzEvents = wrap(() => win.CliqzEvents);
export const CliqzABTests = wrap(() => win.CliqzABTests);
export const getComputedStyle = wrap(() => { throw new Error('Not implemented'); });
export const urlbar = wrap(() => { throw new Error('Not implemented'); });
export const blurUrlBar = wrap(() => { throw new Error('Not implemented'); });
export const EventUtils = wrap(() => { throw new Error('Not implemented'); });
export const TIP = wrap(() => { throw new Error('Not implemented'); });
export const testServer = wrap(() => win.CLIQZ.TestHelpers.testServer);

function clearSingleDB(dbName) {
  const req = win.indexedDB.deleteDatabase(dbName);
  return new Promise((resolve) => {
    req.onsuccess = resolve;
  });
}

export function clearDB(dbNames) {
  return Promise.all(dbNames.map(dbName => clearSingleDB(dbName)));
}

export function focusOnTab(tabId) {
  const updateProperties = { active: true };
  return new Promise(r => chrome.tabs.update(tabId, updateProperties, () => {
    r();
  }));
}
