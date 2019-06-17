/* globals chai */
import { chrome } from '../globals';
import { waitFor } from '../../core/helpers/wait';

const expect = chai.expect;

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

const bgWindow = wrap(() => chrome.extension.getBackgroundPage().window);
export const win = wrap(() => bgWindow);
export const CLIQZ = wrap(() => bgWindow.CLIQZ);
export const app = wrap(() => bgWindow.CLIQZ.app);

const contentQueryHTML = async (...args) => {
  const response = await app.modules.core.action('queryHTML', ...args);
  return response;
};

const contentQueryComputedStyle = async (...args) => {
  const response = await app.modules.core.action('queryComputedStyle', ...args);
  return response;
};

export function getUrl(path) {
  return chrome.runtime.getURL(path);
}

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
export function press(options) {
  return chrome.testHelpers.press(options);
}

export function release(options) {
  return chrome.testHelpers.release(options);
}

function getCSSPath(_el, baseSelector = '') {
  const path = [];
  let el = _el;
  while (el && el.parentNode && el.parentNode.tagName !== 'BODY') {
    const selector = [el.nodeName];

    const n = Array.from(el.parentNode.children).indexOf(el) + 1;
    selector.push(`:nth-child(${n}n)`);

    el = el.parentNode;
    path.push(selector.join(''));
  }

  if (baseSelector) {
    path.push(baseSelector);
  }

  return path.reverse().join(' > ');
}

export const getComputedStyle = async (_selectorOrEl, property) => {
  let selector = _selectorOrEl;
  if (_selectorOrEl instanceof Node) {
    selector = getCSSPath(_selectorOrEl, '#cliqz-dropdown');
  }
  const { styles } = await chrome.testHelpers.querySelector(selector, {
    attributes: false,
    classes: false,
    properties: [],
    children: false,
    text: false,
    html: false,
    styles: [property]
  });
  return styles[property];
};
export const dropdownClick = async selector =>
  chrome.testHelpers.callMethod(selector, 'click', []);

export const urlbar = {
  _cache: {},
  _updateCache(data) {
    Object.assign(this._cache, data);
  },
  blur: () => chrome.testHelpers.blur(),
  focus: () => chrome.testHelpers.focus(),
  get textValue() {
    return chrome.testHelpers.get()
      .then(data => data.visibleValue);
  },
  get selectionStart() {
    return chrome.testHelpers.get()
      .then(data => data.selectionStart);
  },
  get selectionEnd() {
    return chrome.testHelpers.get()
      .then(data => data.selectionEnd);
  },
  get value() {
    return chrome.testHelpers.get()
      .then(data => data.value);
  },
  get lastQuery() {
    return chrome.testHelpers.getLastQuery();
  }
};
export const EventUtils = {
  sendString(text) {
    // returns promise
    return chrome.testHelpers.sendString(text);
  }
};
export const TIP = wrap(() => { throw new Error('Not implemented'); });
export const testServer = wrap(() => win.CLIQZ.TestHelpers.testServer);
export const $cliqzResults = {
  _parser: new DOMParser(),
  _outerHTML: {
    attributes: false,
    classes: false,
    properties: ['outerHTML'],
    styles: [],
    children: false,
    text: false,
    html: false,
  },
  async _getEl() {
    const html = await chrome.testHelpers.querySelector('#cliqz-dropdown', this._outerHTML);
    if (!html) {
      return null;
    }
    return this._parser
      .parseFromString(html.properties.outerHTML, 'text/html');
  },
  async querySelector(selector) {
    const dom = await this._getEl();
    if (!dom) {
      return null;
    }

    return dom.querySelector(`#cliqz-dropdown ${selector}`);
  },
  async querySelectorAll(selector) {
    const dom = await this._getEl();
    if (!dom) {
      return [];
    }

    return dom
      .querySelectorAll(`#cliqz-dropdown ${selector}`);
  }
};

export async function blurUrlBar() {
  const dropdownHeight = await chrome.testHelpers.getDropdownHeight();
  if (dropdownHeight === 0) {
    return Promise.resolve();
  }
  await chrome.testHelpers.blur();
  return waitFor(async () => {
    const height = await chrome.testHelpers.getDropdownHeight();
    return height === 0;
  });
}

function clearSingleDB(dbName) {
  const req = bgWindow.indexedDB.deleteDatabase(dbName);
  return new Promise((resolve) => {
    req.onsuccess = resolve;
  });
}

export function clearDB(dbNames) {
  return Promise.all(dbNames.map(dbName => clearSingleDB(dbName)));
}

export function fillIn(text) {
  return chrome.testHelpers.update({ focused: true, value: '', visibleValue: '', searchString: '' })
    .then(() => EventUtils.sendString(text));
}

export async function waitForPopup(resultsCount, timeout = 700) {
  let nResults;
  await waitFor(async () => {
    const height = await chrome.testHelpers.getDropdownHeight();
    return height !== 0;
  });

  if (resultsCount) {
    await waitFor(
      async () => {
        const navigateResult = await chrome.testHelpers.querySelector('.result.navigate-to');
        const searchResult = await chrome.testHelpers.querySelector('.result.search');
        nResults = navigateResult ? resultsCount + 1 : resultsCount;
        nResults = searchResult ? nResults + 1 : nResults;
        return expect(await chrome.testHelpers.querySelectorAll('.cliqz-result')).to.have.length(nResults);
      },
      timeout,
    );
  }

  return null;
}

export function focusOnTab(tabId) {
  const updateProperties = { active: true };
  return new Promise(r => chrome.tabs.update(tabId, updateProperties, () => {
    r();
  }));
}

export function mockGetSearchEngines(engines) {
  const getSearchEngines = bgWindow.browser.cliqz.getSearchEngines;
  bgWindow.browser.cliqz.getSearchEngines = function mockedGetSearchEngines() {
    return Promise.resolve(engines);
  };
  return getSearchEngines;
}

export function unmockGetSearchEngines(realFunction) {
  bgWindow.browser.cliqz.getSearchEngines = realFunction;
}
