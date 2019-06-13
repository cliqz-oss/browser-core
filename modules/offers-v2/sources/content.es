/**
 * This content script will be activated on particular urls depending if we have an offer
 * that contains a unique coupon or not and we have the proper monitors (coupon monitor)
 * for the offer.
 * If we have then we will basically search for the form associated to the voucher and
 * listen whenever the button is clicked to retrieve the value of the coupon field.
 * As additional we can insert the value of the voucher directly on the field to
 * facilitate the user the work :).
 */
import {
  registerContentScript,
} from '../core/content/helpers';
import config from '../core/config';
import CouponFormObserver from './content/coupon/observer';
import { getPurchaseButtons } from './content/utils';
import amazonPrimeDetection from './content/profile/amazon-prime';
import { serpPageDetection } from './content/profile/serp';
import { shopPageDetection } from './content/profile/shop';
import { classifyByOutgoingLinks } from './content/profile/outgoing-link';

function couponsHandlingScript(window, chrome, CLIQZ) {
  if (window.parent !== window) { return; }

  const backgroundAction = (action, ...args) => {
    CLIQZ.app.modules['offers-v2'].action(action, ...args);
  };

  const url = window.location.href;
  let couponObserver = null;

  const isForThisScriptMessage = msg =>
    msg && msg.response && msg.response.module === 'offers-v2' && msg.response.url === url;

  const activateCouponObserver = (offerInfo) => {
    if (!couponObserver) {
      couponObserver = new CouponFormObserver({
        offerInfo,
        window,
        onClick: (couponValue) => {
          backgroundAction('couponFormUsed', { offerInfo, couponValue, url });
        },
        onFindCouponApplication: (value) => {
          const m = {
            success: 'coupon_autofill_field_success_use',
            error: 'coupon_autofill_field_error_use',
            notfound: 'coupon_autofill_field_application_not_found',
          };
          const couponValue = m[value];
          if (!couponValue) { return; }
          backgroundAction('couponFormUsed', { offerInfo, couponValue, url });
        }
      });
    }
    couponObserver.processForms([...window.document.querySelectorAll('form')]);
    couponObserver.seekForCouponApplication(window.document.body);
  };

  const deactivateCouponObserver = () => {
    if (couponObserver) {
      couponObserver.unload();
      couponObserver = null;
    }
  };

  /**
   * Receive messages from core and proxy them to the copunHandler
   */
  const onMessage = (msg) => {
    // check if if it is a message for us
    if (!isForThisScriptMessage(msg)) {
      return;
    }
    if (msg.response.activate) {
      activateCouponObserver(msg.response.offerInfo);
    } else {
      deactivateCouponObserver();
    }
  };

  const onBuyButtonClicked = () => {
    backgroundAction('onContentSignal', { action: 'purchase', state: 'attempted' });
  };

  const onLoad = () => {
    // after we load we check if we should inject (activate) the script here
    backgroundAction('activateCouponDetectionOnUrl', url);

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
    if (couponObserver) {
      couponObserver.unload();
      couponObserver = null;
    }
    chrome.runtime.onMessage.removeListener(onMessage);
    window.removeEventListener('unload', onUnload);
    window.removeEventListener('load', onLoad);
  };

  window.addEventListener('load', onLoad);
  window.addEventListener('unload', onUnload);
  chrome.runtime.onMessage.addListener(onMessage);
}


registerContentScript('offers-v2', 'http*', couponsHandlingScript);
registerContentScript('offers-v2', 'https://*.amazon.*', amazonPrimeDetection);
if (config.settings['offers.user-journey.enabled']) {
  registerContentScript('offers-v2', 'http*', serpPageDetection);
  registerContentScript('offers-v2', 'http*', shopPageDetection);
  registerContentScript('offers-v2', 'http*', classifyByOutgoingLinks);
}
