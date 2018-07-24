import ToolbarButton from '../core/ui/toolbar-button';
import config from '../core/config';
import prefs from '../core/prefs';
import utils from '../core/utils';
import inject from '../core/kord/inject';
import { getMessage } from '../core/i18n';
import background from '../core/base/background';
import { forEachWindow, getThemeStyle } from '../platform/browser';

const DD_HEIGHT = {
  '04':   () => 413, // amo
  '40':   () => 496, // Q browser
};

function getBrowserActionIcon(){
  const icons = config.settings.PAGE_ACTION_ICONS;
  return config.baseURL + (icons[getThemeStyle()] || icons.default);
}

export default background({
  // injecting ourselfs to get access to windowModule on webextensions
  controlCenter: inject.module('control-center'),

  init(settings) {
    this.settings = settings;

    this.toolbarButton = new ToolbarButton({
      widgetId: 'control-center',
      default_title: getMessage('control_center_icon_tooltip'),
      default_popup: `${config.baseURL}control-center/index.html`,
      default_icon: `${config.baseURL}${settings.ICONS.active.default}`,
      badgeBackgroundColor: '#471647',
      badgeText: '0',
      defaultHeight: DD_HEIGHT[this.settings.channel] || (() => 246)
    });
    this.toolbarButton.build();


    if (this.settings.id === 'description_test@cliqz.com') {
      this.pageAction = new ToolbarButton({
        widgetId: 'page-action',
        default_title: getMessage('control_center_icon_tooltip'),
        default_popup: `${config.baseURL}control-center/index.html`,
        default_icon: getBrowserActionIcon(),
        defaultHeight: () => 251
      }, true);
      this.pageAction.build();
    }
  },

  unload() {
    if (this.toolbarButton) {
      this.toolbarButton.shutdown();
    }

    if (this.pageAction) {
      this.pageAction.shutdown();
    }
  },

  beforeBrowserShutdown() {

  },
  events: {
    "hostthemechange": function onThemeChange(themeStyle) {
      forEachWindow((win) => {
        this.pageAction.setIcon(win, getBrowserActionIcon());
      })
    },
  },
  actions: {
    status() {
      return this.controlCenter.windowAction(utils.getWindow(), 'status');
    },
    complementarySearch() {
      return this.controlCenter.windowAction(utils.getWindow(), 'complementary-search');
    },
    updatePref(data) {
      return this.controlCenter.windowAction(utils.getWindow(), 'updatePref', data);
    },
    searchIndexCountry(data) {
      return this.controlCenter.windowAction(utils.getWindow(), 'search-index-country', data);
    }
  },
});
