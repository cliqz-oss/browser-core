/* global chai */
/* global describeModule */
const { JSDOM } = require('jsdom');

export default describeModule('offers-v2/content/coupon/shared-code',
  () => ({
  }),
  () => {
    describe('coupon shared code', function () {
      describe('/getElementByConfigFieldName', () => {
        let getElementByConfigFieldName;
        const html = `<div class="c-tp-formelement-input">
              <label class="c-tp-formelement-label" for="id48">
                <span class="c-tp-formelement-label-text">Gutscheincode</span>
              </label>
              <div class="c-tp-formelement-input-container">
                <input type="text" value="" name="wsacAndGiftCardInput:r:1:r:cr:1:c:pr:3:m:r:1:r:cr:1:c:pr:1:container:fs:inputAndLabel:c:i:input" id="id48" data-wsac-input-field="" placeholder="eingeben und einlösen">
              </div>
            </div>`;
        const jsdom = new JSDOM(html);
        beforeEach(function () {
          getElementByConfigFieldName = this.module().getElementByConfigFieldName;
        });

        it('/support selectors', function () {
          const elem = getElementByConfigFieldName(
            jsdom.window.document,
            'input[name^=wsacAndGiftCardInput]'
          );

          chai.expect(elem).is.not.null;
          chai.expect(elem.type).is.eq('text');
        });
      });
    });
  });
