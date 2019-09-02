/**
 * This helper class will contain the form we assume is related to the voucher
 * basically the { input, button } + some handy functions
 */
export default class CouponForm {
  constructor({ input, button, clickEvent, onClick }) {
    this.input = input;
    this.button = button;
    this.onClick = onClick;
    this.clickEvent = clickEvent || 'click';

    if (this.button) {
      this.button.addEventListener(this.clickEvent, this._clickCb);
    }
  }

  unload() {
    if (this.button) {
      this.button.removeEventListener(this.clickEvent, this._clickCb);
    }
    this.button = null;
    this.input = null;
    this.onClick = null;
  }

  _clickCb = (event) => {
    if (!event || event.type !== this.clickEvent) { return; }
    // now we perform the real callback
    const couponCode = this.input ? this.input.value : '';
    if (this.onClick) { this.onClick(couponCode); }
  }
}
