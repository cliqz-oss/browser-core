/* global chai */
/* global describeModule */
/* global sinon */

const { JSDOM } = require('jsdom');

export default describeModule('popup-notification/content',
  () => ({
  }),
  () => {
    describe('integration-like tests for popup notification', function () {
      let popnot;
      let render;
      let CLIQZ;
      let chrome;

      beforeEach(async function () {
        popnot = this.module().renderPopup;
        render = (await this.system.import('popup-notification/content/view')).render;
        CLIQZ = {
          app: { modules: { 'popup-notification': { action: sinon.spy() } } }
        };
        chrome = {
          i18n: { getMessage: x => x }
        };
      });

      function makeMessage(extraConfig) {
        return {
          action: 'push',
          module: 'popup-notification',
          url: 'http://cliqz.com/index.html',
          data: {
            back: { },
            preShow: 'try-to-find-coupon',
            onApply: 'insert-coupon-form',
            config: {
              code: '1234-5678',
              ...extraConfig
            }
          }
        };
      }

      function assertApplyButtonIsVisible(document) {
        const div = document.getElementById('cliqz-offer-modal');
        chai.expect(div, 'Shadow root element').to.be.exist;
        chai.expect(div.shadowRoot, 'Shadow root itself').to.be.exist;
        const applyButton = div.shadowRoot.querySelector('.btn-apply');
        chai.expect(applyButton, 'applyButton').to.be.exist;
        chai.expect(!applyButton.classList.contains('none'), 'Apply-button is visible').to.be.true;
        return applyButton;
      }

      it('/walk over functionality with overridden heuristics', async () => {
        //
        // Arrange: load HTML
        //
        const jsdom = new JSDOM(
          `<div>
            <input type="text" id="iid" />
            <img src="#" alt="submit button" id="sid" />
          </div>`,
          { url: 'http://cliqz.com/index.html' }
        );
        jsdom.window.setTimeout = func => func();
        //
        // Arrange: setup callback for an alternative click method
        //
        const specialSubmitSpy = sinon.spy();
        const submitButton = jsdom.window.document.getElementById('sid');
        submitButton.addEventListener('mouseup', specialSubmitSpy);

        //
        // Act: display popup notification
        //
        const onMessage = popnot(jsdom.window, chrome, CLIQZ, render);
        const msg = makeMessage({
          inputID: 'iid',
          submitID: 'sid',
          clickEvent: 'mouseup'
        });
        await onMessage(msg);

        //
        // Assert: check "Apply" button appeared
        //
        const applyButton = assertApplyButtonIsVisible(jsdom.window.document);

        //
        // Act: click on the "Apply" button
        //
        applyButton.click();

        //
        // Assert: coupon is inserted into its input field
        //
        const input = jsdom.window.document.getElementById('iid');
        chai.expect(input, 'coupon input field').to.exist;
        chai.expect(input.value, 'coupon value').to.eql('1234-5678');

        //
        // Assert: button is clicked using "mouseup" as required by config
        //
        chai.expect(specialSubmitSpy, 'overridden click').to.be.called;
      });

      it('/detect generated form on dynamic page', async () => {
        //
        // Arrange: load HTML
        //
        const jsdom = new JSDOM(
          '<div id="div" />',
          { url: 'http://cliqz.com/index.html' }
        );
        //
        // Arrange: on 3rd second, add a coupon form into the document
        //
        let tryN = 0;
        jsdom.window.setTimeout = (func) => {
          tryN += 1;
          if (tryN === 3) {
            const div = jsdom.window.document.getElementById('div');
            div.innerHTML = '<form><input id="coupon" /><input type="submit" /></form>';
          }
          func();
        };

        //
        // Act: display popup notification
        //
        const onMessage = popnot(jsdom.window, chrome, CLIQZ, render);
        const msg = makeMessage({
          isDynamicPage: true
        });
        await onMessage(msg);

        //
        // Assert: check "Apply" button appeared
        //
        assertApplyButtonIsVisible(jsdom.window.document);
      });
    });
  });
