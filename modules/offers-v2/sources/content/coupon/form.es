/**
 * This helper class will contain the form we assume is related to the voucher
 * basically the { input, button } + some handy functions
 */
export default class CouponForm {
  constructor({ input, button, onClick }) {
    this.input = input;
    this.button = button;
    this.onClick = onClick;

    if (this.button) {
      this.button.addEventListener('click', this._clickCb);
    }
  }

  unload() {
    if (this.button) {
      this.button.removeEventListener('click', this._clickCb);
    }
    this.button = null;
    this.input = null;
    this.onClick = null;
    this._clickCb = null;
  }

  fillCode(code) {
    if (this.input && this.input.value.length === 0 && code) {
      this.input.value = code;
    }
  }

  _clickCb = (event) => {
    if (!event || event.type !== 'click') { return; }
    // now we perform the real callback
    const couponCode = this.input ? this.input.value : '';
    if (this.onClick) { this.onClick(couponCode); }
  }
}
