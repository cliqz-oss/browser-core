//
// Coupon journey signal is special.
// - It is a string that grows. We should cut it.
// - The steps "not found" ('N'/'n') and "price not changed" ('Z')
//   can pollute the signal. We avoid repetitions.
//
export function updateSignalValue(journey, step) {
  //
  // Drop a collapsible step that repeats.
  //
  const prevStep = journey[journey.length - 1];
  const isNStep = (step === 'N') || (step === 'n');
  const isCollapsible = isNStep || (step === 'Z');
  if (isCollapsible && (prevStep === step)) {
    return journey;
  }
  //
  // Drop a repeated "not found" step if it alternates with "not found"
  // step of another type.
  //
  if (isNStep) {
    const prevStepWasN = (prevStep === 'N') || (prevStep === 'n');
    if (prevStepWasN) {
      const prevPrevStep = journey[journey.length - 2];
      if (prevPrevStep === step) {
        return journey;
      }
    }
  }
  //
  // Cut the signal if too big.
  //
  let updated = `${journey}${step}`;
  const maxSignalLength = 512;
  if (updated.length > maxSignalLength) {
    updated = `*CUT*${updated.substring(updated.length - maxSignalLength / 2)}`;
  }
  return updated;
}

export default class CouponSignal {
  //
  // `priceDescriber` is an object with two methods:
  // - getShoppingCartDescribedPrices(offerID): priceRec | null
  // - setShoppingCartDescribedPrices(offerID, priceRec): void
  // `priceRec` consists of the fields `base` and `total`
  //
  constructor(priceDescriber) {
    this.priceDescriber = priceDescriber;
  }

  encodeCouponAction({ type, couponValue }, { offerID }) {
    const handlers = {
      coupon_form_not_found: 'N',
      coupon_form_found: 'F',
      coupon_fail_minimal_basket_value: 'M',
      coupon_form_prices: () => this._onCouponPrices(couponValue, offerID),
      coupon_own_used: 'Y',
      coupon_other_used: 'C',
      coupon_empty: 'C',
      popnot_pre_show: () => (couponValue ? 'f' : 'n'),
      coupon_autofill_field_apply_action: 'y',
    };
    const code = handlers[type];
    return code.call ? code() : code;
  }

  /**
   * For prices:
   *
   * - generate delta from the last stored prices
   * - store the current prices
   * - serialize delta
   *
   * In the ideal world this function should be called from
   * `CouponHandler::_onCouponActivity`, but here it is a part of
   * `_encodeCouponAction`. The reason is that the function needs
   * `offerID`, which is revealed only inside monitor signal processing.
   *
   * @param {string[]} prices
   * @param {string} offerID
   */
  _onCouponPrices(prices, offerID) {
    const { total, base } = prices;
    const oldPrices = this.priceDescriber.getShoppingCartDescribedPrices(offerID) || {};
    const { total: oldTotal, base: oldBase } = oldPrices;
    if ((total === oldTotal) && (base === oldBase)) {
      return 'Z'; // Zero delta: prices have not been changed
    }
    this.priceDescriber.setShoppingCartDescribedPrices(offerID, prices);
    const totalDelta = (total || 0) - (oldTotal || 0);
    const baseDelta = (base || 0) - (oldBase || 0);
    const baseDeltaStr = base === oldBase
      ? ''
      : `/${baseDelta.toFixed(2)}`;
    return `{D${totalDelta.toFixed(2)}${baseDeltaStr}}`;
  }
}
