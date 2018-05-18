import ToolbarButton from '../core/ui/toolbar-button';
import config from '../core/config';
import prefs from '../core/prefs';
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
  init(settings) {
    this.settings = settings;

    // we need to hide the toolbarBuuton in the FunnelCake build
    if (this.settings.id !== 'funnelcake@cliqz.com') {
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
    }

    if (this.settings.id === 'funnelcake@cliqz.com' || this.settings.id === 'description_test@cliqz.com') {
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

  },
});
