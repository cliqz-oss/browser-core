/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import chai from 'chai';
import { app, queryHTML, testServer, wrap } from '../../platform/test-helpers/helpers';
import { waitFor, wait } from '../../core/helpers/wait';
import { getCurrentgBrowser } from '../../platform/tabs';

export * from '../../platform/test-helpers/helpers';
export {
  wait,
  waitFor
} from '../../core/helpers/wait';

// Re-export some browser utils
export {
  closeTab,
  newTab,
  updateTab,
  getTab
} from '../../platform/tabs';
export { checkIsWindowActive } from '../../platform/windows';


/**
 * The following helpers are platform independents and can be implemented
 * directly in core.
 */

export const CliqzEvents = wrap(() => app.events);

export const lang = wrap(() => app.i18n.getMessage('locale_lang_code'));

export const prefs = wrap(() => app.prefs);

export const sleep = wait;

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function waitForPrefChange(changedPref) {
  return new Promise(function (resolve) {
    const onPrefChanged = CliqzEvents.subscribe('prefchange', (pref) => {
      if (pref === changedPref) {
        onPrefChanged.unsubscribe();
        resolve();
      }
    });
  });
}

export function clickWithMetaKey(el, opt) {
  const _opt = opt || {};

  // we need to dispatch the event from tests window to dropdown
  const window = el.ownerDocument.defaultView;
  const ev = new window.MouseEvent('click', {
    bubbles: true,
    cancelable: false,
    ctrlKey: _opt.ctrlKey || false,
    metaKey: _opt.metaKey || false
  });
  el.dispatchEvent(ev);
}

export function waitForElement({
  url,
  selector,
  isPresent = true
}) {
  return waitFor(async () => {
    const res = await queryHTML(url, selector, 'innerText');
    if (Boolean((res).length) !== isPresent) {
      throw new Error(`selector "${selector}" no found`);
    }
    return true;
  });
}

export const expect = chai.expect;
export {
  chai
};

export function getAmountOfTabs() {
  const gBrowser = getCurrentgBrowser();
  return gBrowser.tabs.length;
}

export class GenericSubject {
  constructor() {
    this.messages = [];
  }

  load(buildUrl) {
    this.iframe = document.createElement('iframe');
    this.iframe.src = buildUrl;
    this.iframe.width = 307;
    this.iframe.height = 700;
    document.body.appendChild(this.iframe);

    this.iframe.contentWindow.addEventListener('message', (ev) => {
      const data = JSON.parse(ev.data);
      this.messages.push(data);
    });

    return waitFor(() => this.messages.length >= 1);
  }

  unload() {
    document.body.removeChild(this.iframe);
  }

  query(selector) {
    return this.iframe.contentWindow.document.querySelector(selector);
  }

  queryAll(selector) {
    return this.iframe.contentWindow.document.querySelectorAll(selector);
  }

  pushData(target, data = {}, action = 'pushData') {
    this.iframe.contentWindow.postMessage(JSON.stringify({
      target: target,
      origin: 'window',
      message: {
        action,
        data,
      }
    }), '*');
    return wait(500);
  }

  getComputedStyle(selector) {
    return this.iframe.contentWindow.getComputedStyle(this.query(selector));
  }

  getComputedStyleOfElement(element) {
    return this.iframe.contentWindow.getComputedStyle(element);
  }
}

export async function mockPref(key, value, prefix) {
  const prefValue = prefs.get(key, undefined, prefix);

  if (!prefix) {
    prefs.clear(key);
    const p = waitForPrefChange(key);
    prefs.set(key, value);
    await p;
  } else {
    prefs.set(key, value, prefix);
  }

  const unmockPref = (prefValue !== undefined)
    ? () => { prefs.set(key, prefValue, prefix); }
    : () => { prefs.clear(key, prefix); };

  return unmockPref;
}

function getMainPage() {
  return `http://cliqztest.com:${testServer.port}`;
}

export function getPage(url) {
  return `${getMainPage()}/integration_tests/${url}`;
}
