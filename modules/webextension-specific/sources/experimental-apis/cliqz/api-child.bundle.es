/* globals ExtensionAPI */

import { hasPref, getPref } from './prefs';

global.cliqz = class extends ExtensionAPI {
  getAPI() {
    return {
      cliqz: {
        hasPref,
        getPref,
      },
    };
  }
};
