CLIQZ.app.ready().then(() => {
  const offersActions = CLIQZ.app.modules["offers-banner"].background.actions;

  chrome.browserAction.onClicked.addListener(offersActions.showOffers);
  chrome.tabs.onUpdated.addListener(offersActions.toggleApp);
  chrome.tabs.onActivated.addListener(offersActions.toggleApp);
  offersActions.toggleApp();
});
