import {
  registerContentScript,
} from '../core/content/helpers';

import Adblocker from '../platform/lib/adblocker-cosmetics';

registerContentScript('adblocker', 'http*', (window, chrome, CLIQZ) => {
  const url = window.location.href;
  if (!url) { return; }

  /**
   * Helper used to trigger action from the adblocker's background:
   * @param {string} action - name of the action found in the background.
   * @param {array} args - arguments to forward to the action.
   */
  let cosmeticsInjection;

  /* eslint no-use-before-define: 'off' */
  const backgroundAction = (action, ...args) => {
    CLIQZ.app.modules.adblocker.action(action, ...args)
      .then(response => cosmeticsInjection.handleResponseFromBackground(response));
  };

  const isMobile = window.navigator.userAgent.toLowerCase().indexOf('mobile') > -1;
  /**
   * This class is in charge of managing the adblocking in content script:
   * - Script injection.
   * - Script blocking.
   * - CSS injection.
   * - Observing mutations in the page.
   */
  cosmeticsInjection = new Adblocker.CosmeticsInjection(
    window,
    backgroundAction,
    !isMobile,
  );

  // ------------------ //
  // Register listeners //
  // ------------------ //

  const onMessage = (msg) => {
    if (msg.module === 'adblocker') {
      const response = msg.args[0];
      if (msg.action === 'update') {
        // handle push message
        cosmeticsInjection.handleResponseFromBackground(response);
        if (response.moduleDisabled || response.active === false) {
          cosmeticsInjection.unload();
        }
      }
    }
  };

  const onUnload = () => {
    cosmeticsInjection.unload();
    window.removeEventListener('unload', onUnload);
    chrome.runtime.onMessage.removeListener(onMessage);
  };

  window.addEventListener('unload', onUnload);
  chrome.runtime.onMessage.addListener(onMessage);
});
