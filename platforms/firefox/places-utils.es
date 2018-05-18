/* global PlacesUtils */

import { Components } from './globals';

Components.utils.import('resource://gre/modules/PlacesUtils.jsm');

if (!PlacesUtils.asyncHistory) {
  const asyncHistory = Components.classes['@mozilla.org/browser/history;1']
    .getService(Components.interfaces.mozIAsyncHistory);
  PlacesUtils.asyncHistory = asyncHistory;
}

export default PlacesUtils;
