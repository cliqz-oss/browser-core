/* globals chai */
import { app, win, wrap, CliqzUtils, queryHTML } from '../../platform/test-helpers/helpers';
import waitForAsync from '../../core/helpers/wait';
import { getCurrentgBrowser } from '../../platform/tabs';

export * from '../../platform/test-helpers/helpers';

// Fake http server
export { default as testServer } from './http-server';
export { default as waitForAsync } from '../../core/helpers/wait';

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

export const lang = wrap(() => CliqzUtils.getWindow().CLIQZ.i18n.getMessage('locale_lang_code'));

export const prefs = wrap(() => CliqzUtils.getWindow().CLIQZ.prefs);

export function wait(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

export const sleep = wait;

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

let testIntervals = [];

export function registerInterval(interval) {
  testIntervals.push(interval);
}

export function clearIntervals() {
  testIntervals.forEach((interval) => {
    if (interval.stop) {
      interval.stop();
    } else {
      clearInterval(interval);
    }
  });
  testIntervals = [];
}

export function waitFor(fn, until) {
  let resolver;
  let rejecter;
  let interval;
  let error;

  const promise = new Promise((res, rej) => {
    resolver = res;
    rejecter = rej;
  });

  function check() {
    let result = false;

    try {
      result = fn();
    } catch (e) {
      error = e;
    }

    if (result) {
      clearInterval(interval);
      resolver(result);
    }
  }

  interval = setInterval(check, 100);
  check();
  registerInterval(interval);

  if (until) {
    setTimeout(() => rejecter(error), until);
  }

  return promise;
}

export function waitForPrefChange(changedPref) {
  return new Promise(function (resolve) {
    const onPrefChanged = win.CliqzEvents.subscribe('prefchange', (pref) => {
      if (pref === changedPref) {
        onPrefChanged.unsubscribe();
        resolve();
      }
    });
  });
}
export const click = (url, selector) =>
  app.modules.core.action('click', url, selector);

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

export async function waitForElement({
  url,
  selector,
  isPresent = true
}) {
  return waitForAsync(async () => {
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

export async function focusOnTab(tabId) {
  const gBrowser = getCurrentgBrowser();
  const index = [...gBrowser.tabs].findIndex(t => t.linkedBrowser.outerWindowID === tabId);

  await waitFor(() => {
    gBrowser.selectTabAtIndex(index);
    return getCurrentgBrowser().tabs[index].selected;
  });
}


export class GenericSubject {
  constructor() {
    this.messages = [];
  }

  load(buildUrl) {
    this.iframe = document.createElement('iframe');
    this.iframe.src = buildUrl;
    this.iframe.width = 270;
    this.iframe.height = 700;
    document.body.appendChild(this.iframe);

    return new Promise((resolve) => {
      this.iframe.contentWindow.addEventListener('message', (ev) => {
        const data = JSON.parse(ev.data);
        this.messages.push(data);
      });
      return waitFor(() => this.messages.length === 1).then(resolve);
    });
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
