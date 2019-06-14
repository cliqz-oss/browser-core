import { registerContentScript } from '../core/content/helpers';

import Adblocker from '../platform/lib/adblocker-cosmetics';

function isChrome() {
  try {
    return navigator.userAgent.includes('Chrome');
  } catch (e) {
    return false;
  }
}

registerContentScript('adblocker', 'http*', (window, chrome, CLIQZ) => {
  if (!window.location.href) {
    return;
  }

  /**
   * This function will immediatly query the background for cosmetics (scripts,
   * CSS) to inject in the page using its second argument function; then proceed
   * to the injection.
   */
  Adblocker.injectCosmetics(
    window,
    () => CLIQZ.app.modules.adblocker.action('getCosmeticsFilters'),
    isChrome(), // enable Instart Logic defusing for Chrome only
  );
});
