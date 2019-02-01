/* global CLIQZ */
const config = CLIQZ.app.config;

chrome.browserAction2.create({
  default_icon: 'modules/control-center/images/cc-active.svg',
  default_title: chrome.i18n.getMessage('control_center_icon_tooltip'),
  default_popup: `${config.baseURL}control-center/index.html`
});

CLIQZ.app.ready().then(() => {
  const offersActions = CLIQZ.app.modules['offers-banner'].background.actions;
  chrome.browserAction.onClicked.addListener(offersActions.showOffers);
  chrome.tabs.onUpdated.addListener(offersActions.toggleApp);
  chrome.tabs.onActivated.addListener(offersActions.toggleApp);
  offersActions.toggleApp();
});
