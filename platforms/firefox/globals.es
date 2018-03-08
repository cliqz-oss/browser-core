/* global global, Services, Components, XPCOMUtils, debugModules */

import win from './globals-window';

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('resource://gre/modules/Services.jsm');

export {
  Services,
  Components,
  XPCOMUtils,
  win as window,
};

export const debugModules = {};

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

    if (typeof window !== "undefined") {
      return window[key];
    }

    if (typeof global !== "undefined") {
      return global[key];
    }
  },
});
