import {
  registerContentScript,
  CHROME_MSG_SOURCE,
  isCliqzContentScriptMsg
} from '../core/content/helpers';

import platform from '../platform/platform';
import Adblocker from '../platform/lib/adblocker-cosmetics';

registerContentScript('http*', (window, chrome, windowId) => {
  let active = true;
  const url = window.location.href;
  if (!url) { return; }

  /**
   * Helper used to trigger action from the adblocker's background:
   * @param {string} action - name of the action found in the background.
   * @param {array} args - arguments to forward to the action.
   */
  const backgroundAction = (action, ...args) => {
    // if module is diabled, don't call background further
    if (!active) {
      return;
    }
    chrome.runtime.sendMessage({
      source: CHROME_MSG_SOURCE,
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
  const cosmeticsInjection = new Adblocker.CosmeticsInjection(
    window,
    backgroundAction,
  );

  // ------------------ //
  // Register listeners //
  // ------------------ //

  const onMessage = (msg) => {
    // On chromium platform the windowid is a fake on (always === 1),
    // instead the message is sent to the tab through `tabs.sendMessage`
    const sameSourceWindow = msg.windowId === windowId || platform.isChromium;
    if (msg.module === 'adblocker' && sameSourceWindow) {
      if (msg.payload) {
        // handle push message
        cosmeticsInjection.handleResponseFromBackground(msg.payload);
      }
      if (isCliqzContentScriptMsg(msg) && msg.response) {
        if (msg.response.moduleDisabled || msg.response.active === false) {
          active = false;
          cosmeticsInjection.unload();
          return;
        }
        cosmeticsInjection.handleResponseFromBackground(msg.response);
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
