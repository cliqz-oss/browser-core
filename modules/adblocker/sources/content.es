import { registerContentScript } from '../core/content/helpers';

import Adblocker from '../platform/lib/adblocker-cosmetics';

registerContentScript('adblocker', 'http*', (window, chrome, CLIQZ) => {
  if (!window.location.href) {
    return;
  }

  /**
   * This class is in charge of managing the adblocking in content script:
   * - Script injection.
   * - Script blocking.
   * - CSS injection.
   */
  const cosmeticsInjection = new Adblocker.CosmeticsInjection(
    window,
    /**
     * Helper used to trigger action from the adblocker's background:
     * @param {string} action - name of the action found in the background.
     * @param {array} args - arguments to forward to the action.
     */
    (action, ...args) => {
      CLIQZ.app.modules.adblocker
        .action(action, ...args)
        .then((response) => {
          cosmeticsInjection.handleResponseFromBackground(response);
        });
    },
  );

  // Inject hard-coded circumvention logic
  cosmeticsInjection.injectCircumvention();
});
