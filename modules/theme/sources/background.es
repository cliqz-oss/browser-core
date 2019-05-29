import background from '../core/base/background';
import inject from '../core/kord/inject';
import { forEachWindow } from '../platform/browser';

const BLUE_THEME_CLASS = 'cliqz-blue';

export default background({
  theme: inject.module('theme'),

  enabled() {
    return true;
  },


  init() {
  },

  unload() {
  },

  actions: {
    addClass(className) {
      forEachWindow((window) => {
        this.theme.windowAction(window, 'addClass', className);
      });
    },

    removeClass(className) {
      forEachWindow((window) => {
        this.theme.windowAction(window, 'removeClass', className);
      });
    },


    addBlueClass() {
      this.actions.addClass(BLUE_THEME_CLASS);
    },

    removeBlueClass() {
      this.actions.removeClass(BLUE_THEME_CLASS);
    },

    toggleBlueTheme(enabled) {
      if (enabled) {
        this.actions.removeBlueClass();
      } else {
        this.actions.addBlueClass();
      }
    }
  }

});
