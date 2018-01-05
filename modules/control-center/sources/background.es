import ToolbarButton from '../core/ui/toolbar-button';
import config from '../core/config';
import prefs from '../core/prefs';
import { getMessage } from '../core/i18n';
import background from '../core/base/background';
import { forEachWindow, getThemeStyle } from '../platform/browser';

// remove this dynamic part after offersSettings goes 100% to production (dec 2017 - AB test)
function addOffersSettingsHeight() {
  return prefs.get('offers2ShowSettings', false) === true ? 40 : 0;
}

const DD_HEIGHT = {
  'FC01': () => 246,                             // funnelcake
  '04':   () => 379 + addOffersSettingsHeight(), // amo
  '40':   () => 419 + addOffersSettingsHeight(), // Q browser
};

function getBrowserActionIcon(){
  const icons = config.settings.PAGE_ACTION_ICONS;
  return config.baseURL + (icons[getThemeStyle()] || icons.default);
}

export default background({
  init(settings) {
    this.settings = settings;

    // we need to hide the toolbarBuuton in the FunnelCake build
    if (this.settings.id !== 'funnelcake@cliqz.com') {
      this.toolbarButton = new ToolbarButton({
        widgetId: 'control-center',
        default_title: getMessage('control-center-icon-tooltip'),
        default_popup: `${config.baseURL}control-center/index.html`,
        default_icon: `${config.baseURL}${settings.ICONS.active.default}`,
        badgeBackgroundColor: '#471647',
        badgeText: '0',
        defaultHeight: DD_HEIGHT[this.settings.channel] || (() => 246)
      });
      this.toolbarButton.build();
    }

    if (this.settings.id === 'funnelcake@cliqz.com' || this.settings.id === 'description_test@cliqz.com') {
      this.pageAction = new ToolbarButton({
        widgetId: 'page-action',
        default_title: getMessage('control-center-icon-tooltip'),
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

  },
});
