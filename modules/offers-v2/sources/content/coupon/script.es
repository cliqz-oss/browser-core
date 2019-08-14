/**
 * This content script will be activated on particular urls depending if we have an offer
 * that contains a unique coupon or not and we have the proper monitors (coupon monitor)
 * for the offer.
 * If we have then we will basically search for the form associated to the voucher and
 * listen whenever the button is clicked to retrieve the value of the coupon field.
 * As additional we can insert the value of the voucher directly on the field to
 * facilitate the user the work :).
 */
import CouponFormObserver from './observer';

export default function couponsHandlingScript(window, chrome, CLIQZ) {
  if (window.parent !== window) { return; }

  const backgroundAction = (action, ...args) =>
    CLIQZ.app.modules['offers-v2'].action(action, ...args);

  const url = window.location.href;
  let couponObserver = null;

  const isForThisScriptMessage = msg =>
    msg && msg.module === 'offers-v2' && msg.url === url;

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
    couponObserver.processForms(window);
    couponObserver.seekForCouponApplication(window.document.body);
  };

  const deactivateCouponObserver = () => {
    if (couponObserver) {
      couponObserver.unload();
      couponObserver = null;
    }
  };

  /**
   * Receive messages from core and proxy them to the couponHandler
   */
  const onMessage = (msg) => {
    if (!isForThisScriptMessage(msg)) {
      return;
    }
    if (msg.activate) {
      activateCouponObserver(msg.offerInfo);
    } else {
      deactivateCouponObserver();
    }
  };

  const onLoad = async () => {
    // after we load we check if we should inject (activate) the script here
    const msg = await backgroundAction('activateCouponDetectionOnUrl', url);
    if (msg) {
      onMessage(msg);
    }
  };

  const onUnload = () => {
    deactivateCouponObserver();
    window.removeEventListener('unload', onUnload);
    window.removeEventListener('load', onLoad);
  };

  window.addEventListener('load', onLoad);
  window.addEventListener('unload', onUnload);
}
