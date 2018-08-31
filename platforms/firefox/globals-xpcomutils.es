/* global XPCOMUtils, ChromeUtils */

import Components from './globals-components';

if (Components !== undefined) {
  Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
}

export default new Proxy({}, {
  get(_, key) {
    if (typeof XPCOMUtils !== 'undefined' && XPCOMUtils[key] !== undefined) {
      return XPCOMUtils[key];
    }

    if (typeof ChromeUtils !== 'undefined' && ChromeUtils[key] !== undefined) {
      return ChromeUtils[key];
    }

    return undefined;
  }
});
