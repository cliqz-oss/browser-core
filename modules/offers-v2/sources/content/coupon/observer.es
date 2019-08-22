import CouponForm from './form';
import { getCouponsForm } from './utils';
import {
  describePrices,
  isMessageAboutNotEnoughBasketValue,
  skipTagsWhenPriceWalk,
} from './price-describer';

/**
 * This class will find the form and listen for any webpage modification.
 * On modification, find error messages and describe prices for background.
 */
export default class CouponFormObserver {
  constructor({
    window,
    offerInfo,
    onSubmitCoupon,
    onFormFound,
    onDescribePrices,
    onCouponFailedDueMinimalValue
  }) {
    this.window = window;
    this.offerInfo = offerInfo;
    this.onSubmitCoupon = onSubmitCoupon;
    this.onFormFound = onFormFound;
    this.onDescribePrices = onDescribePrices;
    this.onCouponFailedDueMinimalValue = onCouponFailedDueMinimalValue;
    this._onMutations = this._onMutations.bind(this);
    this._onSubmitCoupon = this._onSubmitCoupon.bind(this);
    this.mutationObserver = null;
    this.coupon = null;
  }

  startObserve() {
    this.mutationObserver = new this.window.MutationObserver(this._onMutations);
    this.mutationObserver.observe(this.window.document, { childList: true, subtree: true });
  }

  _onSubmitCoupon(couponValue) {
    this.onSubmitCoupon(couponValue);
  }

  unload() {
    if (this.mutationObserver) { this.mutationObserver.disconnect(); }
    this.mutationObserver = null;
    if (this.coupon) { this.coupon.unload(); }
    this.coupon = null;
    this.offerInfo = null;
    this.window = null;
    this.onSubmitCoupon = null;
    this.onFormFound = null;
    this.onDescribePrices = null;
    this.onCouponFailedDueMinimalValue = null;
  }

  // Some mutations are from ad-scripts: adding <script/> tags,
  // adding empty <div/>s and so on. Ignore such mutations.
  _doesLookLikeAddition(node) {
    if (skipTagsWhenPriceWalk.has(node.tagName)) {
      return false;
    }
    const tc = node.textContent;
    return tc && tc.trim() !== '';
  }

  _onMutations(mutations) {
    //
    // Ignore auxiliary mutations such like loading of additional JavaScript
    //
    let hasMutations = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (this._doesLookLikeAddition(node)) {
          hasMutations = true;
        }
        if (isMessageAboutNotEnoughBasketValue(node)) {
          this.onCouponFailedDueMinimalValue();
          break;
        }
      }
    }
    if (!hasMutations) {
      return;
    }
    //
    // For dynamically generated pages, it is possible that a coupon form
    // has not been found yet. Find it again.
    //
    if (!this.isCouponFormFound()) {
      this.processForms();
    }
    //
    // Describe prices
    //
    if (this.isCouponFormFound()) {
      this.describePrices();
    }
  }

  describePrices() {
    this.onDescribePrices(describePrices(this.window, this.offerInfo));
  }

  // Side-effects:
  // - run callback if found or not
  // - set this.coupon
  processForms() {
    if (this.coupon) {
      this.coupon.unload();
      this.coupon = null;
    }
    const { input, button, ok } = getCouponsForm(this.window, this.offerInfo);
    this.onFormFound(ok);
    if (!ok) { return; }
    this.coupon = new CouponForm({
      input,
      button,
      clickEvent: this.offerInfo.clickEvent,
      onClick: this._onSubmitCoupon,
    });
  }

  isCouponFormFound() {
    return this.coupon;
  }
}
