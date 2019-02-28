/* global CLIQZ */
const config = CLIQZ.app.config;

chrome.browserAction2.create({
  default_icon: 'modules/control-center/images/cc-active.svg',
  default_title: chrome.i18n.getMessage('control_center_icon_tooltip'),
  default_popup: `${config.baseURL}control-center/index.html`
});
