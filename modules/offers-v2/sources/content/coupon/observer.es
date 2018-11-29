/**
 * Module containing the code that will be injected on the web page to identify the
 * coupon fields (textbox + button).
 * General algorithm logic:
 *  - for every T (target = all "form" elements, also the ones detected on mutations)
 *    - check if we have a input field that matches one of the list.
 *    - check if we have a button field in the same form
 *  - pick the ones that match the conditions and assume it is the voucher.
 *  - listen for click events
 */

import CouponForm from './form';
import { getCouponsForm, findCouponApplication } from '../utils';

/**
 * This class will find the form and listen for any webpage modification to get the
 * forms we think are associated to the vouchers and perform the associated
 * actions.
 */
export default class CouponFormObserver {
  constructor({ window, onClick, offerInfo, onFindCouponApplication }) {
    this.offerInfo = offerInfo;
    this.couponValue = '';
    this.onClick = onClick;
    this.onFindCouponApplication = onFindCouponApplication;
    this.coupon = null;
    this._onMutations = this._onMutations.bind(this);
    this._onClick = this._onClick.bind(this);

    this.mutationObserver = new window.MutationObserver(this._onMutations);
    this.mutationObserver.observe(window.document, { childList: true, subtree: true });
  }

  _onClick(couponValue) {
    this.couponValue = couponValue;
    this.onClick(couponValue);
  }

  unload() {
    if (this.mutationObserver) { this.mutationObserver.disconnect(); }
    if (this.coupon) { this.coupon.unload(); }
    this.coupon = null;
    this.mutationObserver = null;
    this.offerInfo = null;
    this.onClick = null;
    this.onFindCouponApplication = null;
    this._onMutations = null;
  }

  _onMutations(mutations) {
    // TODO: improve here the way we can filter mutations.
    // - probably we can check if the current mutation is the form itself (if we have
    // one) then we just check that one, otherwise we check all the full mutations
    if (this.offerInfo && this.offerInfo.autoFillField) {
      const forms = new Set(mutations.map(m => m.target)
        .filter(t => (t && t.tagName && t.tagName.toLowerCase() === 'form')));
      this.processForms([...forms]);
    }
    [...mutations]
      .forEach(m => [...m.addedNodes].forEach(node => this.seekForCouponApplication(node, true)));
  }

  seekForCouponApplication(node, onMutation = false) {
    const code = this.offerInfo && this.offerInfo.code;
    if (!code) { return; }
    if (onMutation && code !== this.couponValue) { return; }
    const result = findCouponApplication(node, code, { strategy: onMutation ? 'full' : 'code' });
    this.onFindCouponApplication(result);
  }

  processForms(targets) {
    const { input, button, ok } = getCouponsForm(targets);
    if (!ok) { return; }
    if (this.offerInfo && this.offerInfo.autoFillField) {
      const tmp = new CouponForm({ input, button, onClick: this._onClick });
      if (this.coupon) { this.coupon.unload(); }
      this.coupon = tmp;
    }
  }
}
