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
import CouponFormObserver from './content/coupon/observer';

function couponsHandlingScript(window, chrome, CLIQZ) {
  // TODO: add general check here if offer is disabled or not enabled we do not
  // inject anything here


  /**
   * Helper method to call offers-v2
   */
  const backgroundAction = (action, ...args) => {
    CLIQZ.app.modules['offers-v2'].action(action, ...args);
  };

  // the current url, check if we need to inject the script here or not based on this
  const url = window.location.href;

  // this class will be the one handling the voucher forms
  let couponObserver = null;

  const isForThisScriptMessage = msg =>
    msg && msg.response && msg.response.module === 'offers-v2' && msg.response.url === url;

  const activateCouponObserver = (offerInfo) => {
    if (!couponObserver) {
      couponObserver = new CouponFormObserver({
        offerInfo,
        window,
        onClick: (couponValue) => {
          backgroundAction('couponFormUsed', {
            offerInfo,
            couponValue,
            url: window.location.href,
          });
        }
      });
    }
    couponObserver.processForms([...window.document.querySelectorAll('form')]);
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

  const onLoad = () => {
    // after we load we check if we should inject (activate) the script here
    backgroundAction('activateCouponDetectionOnUrl', url);
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
