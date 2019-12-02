/* global chai */
/* global describeModule */
/* global sinon */
const { JSDOM } = require('jsdom');
const waitFor = require('../../utils/waitfor');

export default describeModule('offers-v2/content/coupon/script',
  () => ({
  }),
  () => {
    describe('coupon activity, integration-style', function () {
      let couponsHandlingScript;
      let onCouponMessage;
      const someUrl = 'http://cliqz.com/index.html';
      const actionMock = sinon.spy();
      const cliqzMock = { app: { modules: { 'offers-v2': { action: actionMock } } } };
      const chrome = {};

      function getBgMessage(type) {
        const allArgs = type
          ? actionMock.args.filter(args => args[1] && args[1].type === type)
          : actionMock.args;
        chai.expect(allArgs, `Background call of type ${type}`).to.be.not.empty;
        return allArgs[0][1];
      }
      const htmlWithForm = '<form>Coupon: <input id="coupon"/>, apply: <button id="apply"/></form>';

      beforeEach(function () {
        couponsHandlingScript = this.module().default;
        actionMock.resetHistory();
      });

      it('/send `coupon_form_found` signal', () => {
        const jsdom = new JSDOM('<form><input id="ii"/><button id="ss"/></form>', { url: someUrl });
        onCouponMessage = couponsHandlingScript(jsdom.window, chrome, cliqzMock);
        onCouponMessage['detect-coupon-actions']({ offerInfo: {
          inputID: 'ii',
          submitID: 'ss',
        } });

        chai.expect(getBgMessage()).to.contain({ type: 'coupon_form_found' });
      });

      it('/send `coupon_form_not_found` signal', () => {
        const jsdom = new JSDOM('<form><input id="ii"/><button id="ss"/></form>', { url: someUrl });
        onCouponMessage = couponsHandlingScript(jsdom.window, chrome, cliqzMock);
        onCouponMessage['detect-coupon-actions']({ offerInfo: {} });

        chai.expect(getBgMessage()).to.contain({ type: 'coupon_form_not_found' });
      });

      it('/find coupon on a dynamic page', async () => {
        const jsdom = new JSDOM('<div id="for-form"></div>', { url: someUrl });
        const form = JSDOM.fragment(htmlWithForm);
        onCouponMessage = couponsHandlingScript(jsdom.window, chrome, cliqzMock);

        //
        // Arrange: start observer
        //
        onCouponMessage['detect-coupon-actions']({ offerInfo: { isDynamicPage: true } });
        chai.expect(getBgMessage(), 'dynamic page no form')
          .to.contain({ type: 'coupon_form_not_found' });

        //
        // Act % assert: add form, the observer detected that the form has been appeared
        //
        actionMock.resetHistory();
        jsdom.window.document.getElementById('for-form').appendChild(form);
        await waitFor(() => getBgMessage());
        chai.expect(getBgMessage(), 'dynamic page form found')
          .to.contain({ type: 'coupon_form_found' });
      });

      const htmlWithPrices = `<div>
          <p><span class="base">23.23€</span>, rabatt 5% <span>1,16</span></p>
          <p><span>Total: 22.07€</span></p>
        </div>`;

      it('/send prices on page load', () => {
        const jsdom = new JSDOM(`<div>${htmlWithPrices}${htmlWithForm}</div>`, { url: someUrl });
        onCouponMessage = couponsHandlingScript(jsdom.window, chrome, cliqzMock);
        onCouponMessage['detect-coupon-actions']({ offerInfo: {} });

        const bgMsg = getBgMessage('coupon_form_prices');
        chai.expect(bgMsg).to.deep.contain({ couponValue: { total: 22.07, base: 23.23 } });
      });

      it('/use an external hint to find the total price', () => {
        const jsdom = new JSDOM(`<div>${htmlWithPrices}${htmlWithForm}</div>`, { url: someUrl });
        onCouponMessage = couponsHandlingScript(jsdom.window, chrome, cliqzMock);
        onCouponMessage['detect-coupon-actions']({ offerInfo: { totalSelector: '.base' } });

        const bgMsg = getBgMessage('coupon_form_prices');
        chai.expect(bgMsg).to.deep.contain({ couponValue: { total: 23.23 } });
      });

      it('/send prices on page change', async () => {
        const jsdom = new JSDOM(htmlWithForm, { url: someUrl });
        onCouponMessage = couponsHandlingScript(jsdom.window, chrome, cliqzMock);
        onCouponMessage['detect-coupon-actions']({ offerInfo: { totalSelector: '.base' } });

        actionMock.resetHistory();
        const form = JSDOM.fragment(htmlWithPrices);

        jsdom.window.document.getElementsByTagName('form')[0].appendChild(form);

        await waitFor(() => getBgMessage());
        const bgMsg = getBgMessage('coupon_form_prices');
        chai.expect(bgMsg).to.deep.contain({ couponValue: { total: 23.23 } });
      });

      it('/send applied coupon on button click', async () => {
        const jsdom = new JSDOM(htmlWithForm, { url: someUrl });
        onCouponMessage = couponsHandlingScript(jsdom.window, chrome, cliqzMock);
        onCouponMessage['detect-coupon-actions']({ offerInfo: { clickEvent: 'mouseup' } });
        const input = jsdom.window.document.getElementsByTagName('input')[0];
        input.value = 'SomeVoucher';

        //
        // Act: submit the coupon using 'mouseup' event
        //
        const submit = jsdom.window.document.getElementsByTagName('button')[0];
        const evt = jsdom.window.document.createEvent('Event');
        evt.initEvent('mouseup', true, true);
        submit.dispatchEvent(evt);

        //
        // Assert: got the coupon value
        //
        await waitFor(() => getBgMessage());
        const bgMsg = getBgMessage('coupon_submitted');
        chai.expect(bgMsg).to.deep.contain({ couponValue: 'SomeVoucher' });
      });

      it('/notify basket value is too small', async () => {
        const jsdom = new JSDOM(htmlWithForm, { url: someUrl });
        onCouponMessage = couponsHandlingScript(jsdom.window, chrome, cliqzMock);
        onCouponMessage['detect-coupon-actions']({ offerInfo: {} });

        const warning = JSDOM.fragment('<p>Der Mindestwert ist nicht erreicht!</p>');
        jsdom.window.document.body.appendChild(warning);

        await waitFor(() => getBgMessage('coupon_fail_minimal_basket_value'));
      });
    });
  });
