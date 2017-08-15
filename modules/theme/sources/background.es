import background from '../core/base/background';
import inject from '../core/kord/inject';
import { forEachWindow } from '../core/browser';

export default background({
  init() {
  },

  unload() {
  },

  actions: {
    addClass(className) {
      forEachWindow(window => {
        inject.module('theme').windowAction(window, 'addClass', className);
      });
    },

    removeClass(className) {
      forEachWindow(window => {
        inject.module('theme').windowAction(window, 'removeClass', className);
      });
    },
  },
});
