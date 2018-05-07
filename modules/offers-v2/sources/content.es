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
  isCliqzContentScriptMsg,
  CHROME_MSG_SOURCE
} from '../core/content/helpers';
import CouponFormHandler from './offers/monitor/coupon-content';


function couponsHandlingScript(window, chrome) {
  // TODO: add general check here if offer is disabled or not enabled we do not
  // inject anything here


  /**
   * Helper method to call offers-v2
   */
  const backgroundAction = (action, ...args) => {
    chrome.runtime.sendMessage({
      source: CHROME_MSG_SOURCE,
      payload: {
        module: 'offers-v2',
        action,
        args,
      }
    });
  };

  // the current url, check if we need to inject the script here or not based on this
  const url = window.location.href;

  // this class will be the one handling the voucher forms
  let couponHandler = null;

  const isForThisScriptMessage = msg =>
    msg && msg.module === 'offers-v2' && msg.response && msg.response.url === url;

  const activateCouponHandler = (offersInfo) => {
    if (!couponHandler || !offersInfo) {
      couponHandler = new CouponFormHandler(window, chrome, backgroundAction);
      couponHandler.activate(offersInfo);
    }
  };

  const deactivateCouponHandler = () => {
    if (couponHandler) {
      couponHandler.deactivate();
      couponHandler = null;
    }
  };

  /**
   * Receive messages from core and proxy them to the copunHandler
   */
  const onMessage = (msg) => {
    // check if if it is a message for us
    if (!isCliqzContentScriptMsg(msg) || !isForThisScriptMessage(msg)) {
      return;
    }

    // check if we are activating or disabling
    if (msg.response.activate) {
      // we need to activate
      activateCouponHandler(msg.response.offerInfo);
    } else {
      // we need to deactivate
      deactivateCouponHandler();
    }
  };

  const onLoad = () => {
    // after we load we check if we should inject (activate) the script here
    backgroundAction('activateCouponDetectionOnUrl', url);
  };

  const onUnload = () => {
    if (couponHandler) {
      couponHandler.deactivate();
    }
    chrome.runtime.onMessage.removeListener(onMessage);
    window.removeEventListener('unload', onUnload);
    window.removeEventListener('load', onLoad);
  };

  window.addEventListener('load', onLoad);
  window.addEventListener('unload', onUnload);
  chrome.runtime.onMessage.addListener(onMessage);
}


registerContentScript('http*', couponsHandlingScript);
