import utils from '../core/utils';
import { window } from '../platform/globals';

export default {
  requiresServices: [
    'test-helpers'
  ],
  init() {
    if (typeof window === 'object') {
      window.CLIQZ.utils = utils;
    }
  },
  unload() {}
};
