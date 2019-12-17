/* global chai */
/* global describeModule */
const fs = require('fs');
const { JSDOM } = require('jsdom');

export default describeModule('popup-notification/content/processing',
  () => ({
  }),
  () => {
    describe('coupon input field detection', function () {
      let tryToFindCoupon;
      let fixtureDir;
      const foundOk = {
        ok: true,
        config: { shouldHideButtons: false, shouldPreventRender: false }
      };

      beforeEach(function () {
        const preShowActions = this.module().preShowActions;
        tryToFindCoupon = preShowActions('try-to-find-coupon');
        fixtureDir = this.fixtureDir();
      });

      function makeWindow(fixtureFileName) {
        const fname = `${fixtureDir}/coupon-page/${fixtureFileName}`;
        const htmlContent = fs.readFileSync(fname);
        return (new JSDOM(htmlContent)).window;
      }

      context('find coupon field', function () {
        function testCouponFound(siteName) {
          it(`${siteName}`, () => {
            const window = makeWindow(`${siteName}.html`);

            const isFound = tryToFindCoupon(window, {});

            chai.expect(isFound).to.eql(foundOk);
          });
        }

        testCouponFound('emp.de');

        it('/find with explicit IDs', () => {
          const jsdom = new JSDOM(`<div>
              <input type="text" id="iid" />
              <img src="#" alt="submit button" id="sid" />
            </div>`);

          const isFound = tryToFindCoupon(jsdom.window, {
            inputID: 'iid',
            submitID: 'sid',
          });

          chai.expect(isFound.ok).to.be.true;
        });

        it('/find with only one explicit ID, for coupon input', () => {
          const jsdom = new JSDOM(`<form>
              <input type="text" id="iid" />
              <button type="submit" />
            </form>`);

          const isFound = tryToFindCoupon(jsdom.window, { inputID: 'iid' });

          chai.expect(isFound.ok).to.be.true;
        });

        it('/find with only one explicit ID, for submit button', () => {
          const jsdom = new JSDOM(`<form>
              <input type="text" id="coupon" />
              <button type="submit" />
              <button type="submit" />
              <button type="submit" id="sid" />
            </form>`);

          const isFound = tryToFindCoupon(jsdom.window, { submitID: 'sid' });

          chai.expect(isFound.ok).to.be.true;
        });

        it('/use IDs as a css selector', () => { // vistaprint
          const jsdom = new JSDOM(`<div>
              <input type="text" class="cl1 iid cl2" />
              <img src="#" alt="submit button" class="cl3 sid cl4" />
            </div>`);

          const isFound = tryToFindCoupon(jsdom.window, {
            inputID: 'input.iid',
            submitID: 'img.sid',
          });

          chai.expect(isFound.ok).to.be.true;
        });
      });
    });
  });
