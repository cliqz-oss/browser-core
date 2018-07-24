/* global Services */

import Components from './globals-components';

if (Components !== undefined) {
  Components.utils.import('resource://gre/modules/Services.jsm');
}

export default (typeof Services !== 'undefined') ? Services : undefined;
