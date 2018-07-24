/* global XPCOMUtils */

import Components from './globals-components';

if (Components !== undefined) {
  Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
}

export default (typeof XPCOMUtils !== 'undefined') ? XPCOMUtils : undefined;
