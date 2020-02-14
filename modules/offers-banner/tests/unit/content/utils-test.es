/* global chai */
/* global describeModule */
const fs = require('fs');
const { JSDOM } = require('jsdom');

export default describeModule('offers-banner/content/utils',
  () => ({}),
  () => {
    describe('coupon input field detection', function () {
      let tryToFindCoupon;
      let fixtureDir;

      beforeEach(function () {
        tryToFindCoupon = this.module().tryToFindCoupon;
        fixtureDir = this.fixtureDir();
      });

      function makeWindow(fixtureFileName) {
        const fname = `${fixtureDir}/coupon-page/${fixtureFileName}`;
        const htmlContent = fs.readFileSync(fname);
        return (new JSDOM(htmlContent)).window;
      }

      context('find coupon field', function () {
        it('emp.de', () => {
          const foundOk = {
            result: { ok: true, payload: { canInject: true } },
            tryAgain: false,
          };
          const window = makeWindow('emp.de.html');
          const isFound = tryToFindCoupon(window, {});
          chai.expect(isFound).to.eql(foundOk);
        });

        it('/find with explicit IDs', () => {
          const jsdom = new JSDOM(`<div>
              <input type="text" id="iid" />
              <img src="#" alt="submit button" id="sid" />
            </div>`);
          const isFound = tryToFindCoupon(jsdom.window, {
            inputID: 'iid',
            submitID: 'sid',
          });
          chai.expect(isFound.result.ok).to.be.true;
        });

        it('/find with only one explicit ID, for coupon input', () => {
          const jsdom = new JSDOM(`<form>
              <input type="text" id="iid" />
              <button type="submit" />
            </form>`);

          const isFound = tryToFindCoupon(jsdom.window, { inputID: 'iid' });
          chai.expect(isFound.result.ok).to.be.true;
        });

        it('/find with only one explicit ID, for submit button', () => {
          const jsdom = new JSDOM(`<form>
              <input type="text" id="coupon" />
              <button type="submit" />
              <button type="submit" />
              <button type="submit" id="sid" />
            </form>`);

          const isFound = tryToFindCoupon(jsdom.window, { submitID: 'sid' });
          chai.expect(isFound.result.ok).to.be.true;
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
          chai.expect(isFound.result.ok).to.be.true;
        });
      });
    });
  });
