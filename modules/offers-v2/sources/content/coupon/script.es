/**
 * This content script will be activated on particular urls depending if we have an offer
 * that contains a unique coupon or not and we have the proper monitors (coupon monitor)
 * for the offer.
 * If we have then we will basically search for the form associated to the voucher and
 * listen whenever the button is clicked to retrieve the value of the coupon field.
 * Also, we describe prices to understand if coupon is applied successfully.
 */
import CouponFormObserver from './observer';

export default function couponsHandlingScript(window, chrome, CLIQZ) {
  const backgroundAction = (action, ...args) =>
    CLIQZ.app.modules['offers-v2'].action(action, ...args);

  const url = window.location.href;
  let couponObserver = null;

  const deactivateCouponObserver = () => {
    if (couponObserver) {
      couponObserver.unload();
      couponObserver = null;
    }
  };

  const onUnload = () => {
    deactivateCouponObserver();
  };

  window.addEventListener('unload', onUnload, { once: true });

  return {
    'detect-coupon-actions': ({ offerInfo }) => {
      if (!couponObserver) {
        couponObserver = new CouponFormObserver({
          offerInfo,
          window,
          onSubmitCoupon: (couponValue) => {
            backgroundAction('couponFormUsed', {
              type: 'coupon_submitted',
              offerInfo,
              couponValue,
              url
            });
          },
          onFormFound: (isFound) => {
            backgroundAction('couponFormUsed', {
              type: isFound ? 'coupon_form_found' : 'coupon_form_not_found',
              offerInfo,
              url
            });
          },
          onDescribePrices: (prices) => {
            backgroundAction('couponFormUsed', {
              type: 'coupon_form_prices',
              offerInfo,
              couponValue: prices,
              url
            });
          },
          onCouponFailedDueMinimalValue: () => {
            backgroundAction('couponFormUsed', {
              type: 'coupon_fail_minimal_basket_value',
              offerInfo,
              url
            });
          },
        });
      }

      couponObserver.processForms();
      if (couponObserver.isCouponFormFound()) {
        couponObserver.describePrices();
      }

      if (couponObserver.isCouponFormFound() || offerInfo.isDynamicPage) {
        couponObserver.startObserve();
      } else {
        onUnload();
      }
    },
  };
}
