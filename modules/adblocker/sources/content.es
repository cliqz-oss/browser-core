import { registerContentScript } from '../core/content/helpers';
import CosmeticsInjection from './cosmetics-injection';
import logger from './logger';


registerContentScript('http*', (window, chrome, windowId) => {
  const url = window.location.href;
  if (!url) { return; }

  /**
   * Helper used to trigger action from the adblocker's background:
   * @param {string} action - name of the action found in the background.
   * @param {array} args - arguments to forward to the action.
   */
  const backgroundAction = (action, ...args) => {
    chrome.runtime.sendMessage({
      windowId,
      payload: {
        module: 'adblocker',
        action,
        args,
      }
    });
  };

  /**
   * This class is in charge of managing the adblocking in content script:
   * - Script injection.
   * - Script blocking.
   * - CSS injection.
   * - Observing mutations in the page.
   */
  const cosmeticsInjection = new CosmeticsInjection(url, window, backgroundAction);

  // ------------------ //
  // Register listeners //
  // ------------------ //

  const onDOMContentLoaded = () => {
    cosmeticsInjection.onDOMContentLoaded();
  };

  const onMessage = (msg) => {
    if (msg.windowId === windowId && msg && msg.response) {
      cosmeticsInjection.handleResponseFromBackground(msg.response);
    }
  };

  const onUnload = () => {
    cosmeticsInjection.unload();
    window.removeEventListener('DOMContentLoaded', onDOMContentLoaded);
    window.removeEventListener('unload', onUnload);
    chrome.runtime.onMessage.removeListener(onMessage);
  };

  window.addEventListener('DOMContentLoaded', onDOMContentLoaded);
  window.addEventListener('unload', onUnload);
  chrome.runtime.onMessage.addListener(onMessage);
});
