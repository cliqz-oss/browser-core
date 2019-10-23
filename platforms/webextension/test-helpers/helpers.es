/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* globals chai */
import { browser } from '../globals';
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
  const window = browser.extension.getViews().find(w => w.location.href === url);

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
  const window = browser.extension.getViews().find(w => w.location.href === url);

  if (!window) {
    return [];
  }

  return Array.prototype.map.call(
    window.document.querySelectorAll(selector),
    el => window.getComputedStyle(el),
  );
};

const bgWindow = wrap(() => browser.extension.getBackgroundPage().window);
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
  return browser.runtime.getURL(path);
}

export function queryHTML(url, ...rest) {
  if (url.startsWith(browser.runtime.getURL(''))) {
    return chromeQueryHtml(url, ...rest);
  }
  return contentQueryHTML(url, ...rest);
}

export function queryComputedStyle(url, ...rest) {
  if (url.startsWith(browser.runtime.getURL(''))) {
    return chromeQueryComputedStyle(url, ...rest);
  }
  return contentQueryComputedStyle(url, ...rest);
}

const contentClick = (url, selector) => app.modules.core.action('click', url, selector);

export function elementAction(url, selector, action, ind = 0) {
  const window = browser.extension.getViews().find(w => w.location.href === url);

  if (!window) {
    return [];
  }

  return window.document.querySelectorAll(selector)[ind][action]();
}

export function click(url, selector, ind = 0) {
  if (url.startsWith(browser.runtime.getURL(''))) {
    return elementAction(url, selector, 'click', ind);
  }
  return contentClick(url, selector);
}

export function setUrlbarSelection(selectionStart, selectionEnd) {
  return browser.testHelpers.update({ selectionStart, selectionEnd });
}

export function press(options) {
  return browser.testHelpers.press(options);
}

export function release(options) {
  return browser.testHelpers.release(options);
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
  const { styles } = await browser.testHelpers.querySelector(selector, {
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
  browser.testHelpers.callMethod(selector, 'click', []);

export const dropdownClickExt = async (selector, opt) =>
  browser.testHelpers.callMethodExt(selector, 'click', opt);

export const urlbar = {
  blur: () => browser.testHelpers.blur(),
  focus: () => browser.testHelpers.focus(),
  get textValue() {
    return browser.testHelpers.get()
      .then(data => data.visibleValue);
  },
  get selectionStart() {
    return browser.testHelpers.get()
      .then(data => data.selectionStart);
  },
  get selectionEnd() {
    return browser.testHelpers.get()
      .then(data => data.selectionEnd);
  },
  get value() {
    return browser.testHelpers.get()
      .then(data => data.value);
  },
  get lastQuery() {
    return browser.testHelpers.getLastQuery();
  }
};
export const EventUtils = {
  sendString(text) {
    // returns promise
    return browser.testHelpers.sendString(text);
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
    const html = await browser.testHelpers.querySelector('#cliqz-dropdown', this._outerHTML);
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
  const { height, focused } = await browser.testHelpers.get();
  if (!focused && height === 0) {
    return Promise.resolve();
  }

  let onSessionEnd = null;
  await browser.testHelpers.blur();
  return Promise.all([
    new Promise((resolve) => {
      onSessionEnd = resolve;
      CLIQZ.app.events.sub('search:session-end', resolve);
      setTimeout(resolve, 1000);
    }),
    waitFor(async () => {
      const { height: h, focused: f } = await browser.testHelpers.get();
      return !f && h === 0;
    }),
  ])
    .then(() => {
      CLIQZ.app.events.un_sub('search:session-end', onSessionEnd);
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
  return browser.testHelpers.update({ focused: true, value: '', visibleValue: '' })
    .then(() => EventUtils.sendString(text));
}

export async function waitForPopup(resultsCount, timeout = 700) {
  let nResults;
  await waitFor(async () => {
    const height = await browser.testHelpers.getDropdownHeight();
    return height !== 0;
  });

  if (resultsCount) {
    await waitFor(
      async () => {
        const navigateResult = await browser.testHelpers.querySelector('.result.navigate-to');
        const searchResult = await browser.testHelpers.querySelector('.result.search');
        nResults = navigateResult ? resultsCount + 1 : resultsCount;
        nResults = searchResult ? nResults + 1 : nResults;
        return expect(await browser.testHelpers.querySelectorAll('.cliqz-result')).to.have.length(nResults);
      },
      timeout,
    );
  }

  return null;
}

export async function waitForPopupClosed(timeout) {
  await waitFor(async () => {
    const height = await browser.testHelpers.getDropdownHeight();
    return height === 0;
  }, timeout);
}

export function focusOnTab(tabId) {
  const updateProperties = { active: true };
  return browser.tabs.update(tabId, updateProperties);
}

export function mockBackgroundProp(propStringPath, newProp) {
  const propPath = propStringPath.split('.');
  const lastProp = propPath.pop();
  const original = propPath.reduce((obj, prop, i) => {
    if (typeof obj[prop] === 'undefined') {
      throw new Error(`Can't mock ${propStringPath}: ${propPath.slice(0, i + 1).join('.')} is undefined.`);
    }
    return obj[prop];
  }, bgWindow);

  const oldProp = original[lastProp];
  original[lastProp] = newProp;

  return function unmock() {
    original[lastProp] = oldProp;
  };
}

export function mockGetSearchEngines(engines) {
  return mockBackgroundProp('browser.cliqz.getSearchEngines', () => Promise.resolve(engines));
}
