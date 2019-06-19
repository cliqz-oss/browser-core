import { registerContentScript } from '../core/content/helpers';

import { Cosmetics, Circumvention } from '../platform/lib/adblocker-cosmetics';

function isChrome() {
  try {
    return navigator.userAgent.includes('Chrome');
  } catch (e) {
    return false;
  }
}

registerContentScript('adblocker', 'http*', (window, chrome, CLIQZ) => {
  /**
   * This function will immediatly query the background for cosmetics (scripts,
   * CSS) to inject in the page using its second argument function; then proceed
   * to the injection. It will also monitor the DOM using a MutationObserver to
   * know which cosmetics/scriptlets to inject.
   */
  Cosmetics.injectCosmetics(
    window,
    payload => CLIQZ.app.modules.adblocker.action('getCosmeticsFilters', payload),
    true, /* enable mutation observer */
  );

  if (isChrome()) {
    // Enable Instart Logic defusing for Chrome only
    Circumvention.injectCircumvention(window);
  }
});
