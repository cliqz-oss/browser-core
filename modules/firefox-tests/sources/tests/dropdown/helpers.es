/* global window */

import chai from 'chai';

// TODO: remove wrapper when all tests will land in single bundle
// it is only needed as we cannot acqure references to all object on loading time
const wrap = getObj => new Proxy({}, {
  get(target, name) {
    const obj = getObj();
    return obj[name];
  }
});

export const expect = chai.expect;
export const withHistory = (...args) => window.withHistory(...args);
export const CliqzUtils = wrap(() => window.CliqzUtils);
export const respondWith = (...args) => window.respondWith(...args);
export const respondWithSuggestions = (...args) => window.respondWithSuggestions(...args);
export const fillIn = (...args) => window.fillIn(...args);
export const waitForPopup = (...args) => window.waitForPopup(...args);
export const $cliqzResults = (...args) => window.$cliqzResults(...args);
export const getLocaliseString = (...args) => window.getLocaliseString(...args);
export const app = wrap(() => window.app);
export const getComputedStyle = (...args) => window.getComputedStyle(...args);
