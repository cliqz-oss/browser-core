/* global Services, Components, XPCOMUtils, debugModules */

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('resource://gre/modules/Services.jsm');

export {
  Services,
  Components,
  XPCOMUtils,
};

export const debugModules = {};

// TODO: @remusao webrequest-pipeline/page-store require chrome
export const chrome = {};
