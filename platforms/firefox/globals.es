/* global global */

import win from './globals-window';
import Components from './globals-components';
import XPCOMUtils from './globals-xpcomutils';
import Services from './globals-services';


export {
  Services,
  Components,
  XPCOMUtils,
  win as window
};

// TODO: @remusao webrequest-pipeline/page-store require chrome
export const chrome = {};

const fakeGlobal = Object.create(null);

/**
 * exporting a global object to allow access to javascript buildins like
 * Object, Symbol
 */
/* eslint-disable func-names, prefer-arrow-callback, new-cap */
export const safeGlobal = new Proxy(fakeGlobal, {
  get(target, key) {
    if (fakeGlobal[key]) {
      return fakeGlobal[key];
    }

    if (typeof win !== 'undefined') {
      return win[key];
    }

    if (typeof global !== 'undefined') {
      return global[key];
    }

    return undefined;
  },
});
