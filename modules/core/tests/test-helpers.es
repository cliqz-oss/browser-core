/* globals chai */
import { win, wrap, CliqzUtils, queryHTML } from '../../platform/test-helpers/helpers';
import { waitForAsync, waitFor, wait } from '../../core/helpers/wait';
import { getCurrentgBrowser } from '../../platform/tabs';

export * from '../../platform/test-helpers/helpers';
export {
  wait,
  waitFor,
  waitForAsync
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

export const lang = wrap(() => CliqzUtils.getWindow().CLIQZ.i18n.getMessage('locale_lang_code'));

export const prefs = wrap(() => CliqzUtils.getWindow().CLIQZ.prefs);

export const sleep = wait;

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
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
