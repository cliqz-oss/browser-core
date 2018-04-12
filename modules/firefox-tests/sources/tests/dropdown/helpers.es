/* global window */

import chai from 'chai';

// TODO: remove wrapper when all tests will land in single bundle
// it is only needed as we cannot acqure references to all object on loading time
const wrap = getObj => new Proxy({}, {
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

export const app = wrap(() => window.app);
export const clearIntervals = (...args) => window.clearIntervals(...args);
export const click = (...args) => window.click(...args);
export const $cliqzResults = (...args) => window.$cliqzResults(...args);
export const CliqzUtils = wrap(() => window.CliqzUtils);
export const expect = chai.expect;
export const fastFillIn = (...args) => window.fastFillIn(...args);
export const fillIn = (...args) => window.fillIn(...args);
export const getComputedStyle = (...args) => window.getComputedStyle(...args);
export const getLocaliseString = (...args) => window.getLocaliseString(...args);
export const press = (...args) => window.press(...args);
export const pressAndWaitFor = (...args) => window.pressAndWaitFor(...args);
export const release = (...args) => window.release(...args);
export const respondWith = (...args) => window.respondWith(...args);
export const respondWithSuggestions = (...args) => window.respondWithSuggestions(...args);
export const setUserInput = (...args) => window.setUserInput(...args);
export const sleep = (...args) => window.sleep(...args);
export const urlbar = wrap(() => CliqzUtils.getWindow().gURLBar);
export const waitFor = (...args) => window.waitFor(...args);
export const waitForPopup = (...args) => window.waitForPopup(...args);
export const waitForPopupClosed = (...args) => window.waitForPopupClosed(...args);
export const withHistory = (...args) => window.withHistory(...args);
export function blurUrlBar() {
  urlbar.mInputField.setUserInput('');
  urlbar.blur();
  urlbar.mInputField.blur();
}
