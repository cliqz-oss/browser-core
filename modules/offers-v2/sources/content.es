import {
  registerContentScript,
} from '../core/content/helpers';
import config from '../core/config';
import couponsHandlingScript from './content/coupon/script';
import amazonPrimeDetection from './content/profile/amazon-prime';
import { serpPageDetection } from './content/profile/serp';
import { shopPageDetection } from './content/profile/shop';
import { classifyByOutgoingLinks } from './content/profile/outgoing-link';
import { getPurchaseButtons } from './content/coupon/utils';

function logPurchaseButtonScript(window, chrome, CLIQZ) {
  if (window.parent !== window) {
    return;
  }

  const backgroundAction = (action, ...args) =>
    CLIQZ.app.modules['offers-v2'].action(action, ...args);

  const onBuyButtonClicked = () => {
    backgroundAction('onContentSignal', { action: 'purchase', state: 'attempted' });
  };

  const onLoad = () => {
    // Check if there is a purchase button
    // TODO: This does not work with dynamic page content yet
    const buyButtons = getPurchaseButtons(window);
    // Do nothing if this page is full of buy buttons
    if (buyButtons.length > 5) {
      // Todo: add a different signal to this action
      return;
    }
    if (buyButtons.length > 0) {
      buyButtons.forEach((button) => {
        button.addEventListener('click', onBuyButtonClicked);
      });
    }
  };

  const onUnload = () => {
    window.removeEventListener('unload', onUnload);
    window.removeEventListener('load', onLoad);
  };

  window.addEventListener('load', onLoad);
  window.addEventListener('unload', onUnload);
}


registerContentScript('offers-v2', 'http*', logPurchaseButtonScript);
registerContentScript('offers-v2', 'http*', couponsHandlingScript);
registerContentScript('offers-v2', 'https://*.amazon.*', amazonPrimeDetection);
if (config.settings['offers.user-journey.enabled']) {
  registerContentScript('offers-v2', 'http*', serpPageDetection);
  registerContentScript('offers-v2', 'http*', shopPageDetection);
  registerContentScript('offers-v2', 'http*', classifyByOutgoingLinks);
}
