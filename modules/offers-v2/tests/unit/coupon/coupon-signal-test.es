/* global chai */
/* global describeModule */
const commonMocks = require('../utils/common');

export default describeModule('offers-v2/coupon/coupon-signal',
  () => ({
    ...commonMocks,
  }),
  () => {
    describe('/coupon signal', function () {
      let updateSignalValue;
      beforeEach(function () {
        updateSignalValue = this.module().updateSignalValue;
      });

      describe('/update signal value', () => {
        it('/smoke test, just add new content', () => {
          const newVal = updateSignalValue('aaa', 'bbb');

          chai.expect(newVal).to.eq('aaabbb');
        });

        function runFixture(fixture) {
          fixture.forEach(([journey, step, expected]) => {
            const updated = updateSignalValue(journey, step);

            chai.expect(updated, `coupon journey ${journey} + ${step}`).to.eq(expected);
          });
        }

        it('/collapse same "not-found", collapse "price not changed"', () => {
          const fixture = [
            ['N', 'N', 'N'],
            ['n', 'n', 'n'],
            ['Z', 'Z', 'Z'],
          ];
          runFixture(fixture);
        });

        it('/collapse alternate "not-found" steps', () => {
          const fixture = [
            ['xxx_nN', 'n', 'xxx_nN'],
            ['xxx_Nn', 'N', 'xxx_Nn'],
            // but only if the same step seen recently
            ['xxx_N', 'n', 'xxx_Nn'],
            ['xxx_n', 'N', 'xxx_nN'],
            // and only if the last step was also "not-found"
            ['xxx_NZ', 'N', 'xxx_NZN'],
            ['xxx_nZ', 'n', 'xxx_nZn'],
          ];
          runFixture(fixture);
        });

        it('/limit size of the signal', () => {
          const bigJourney = 'a'.repeat(512);

          const updated = updateSignalValue(bigJourney, 'x');

          chai.expect(updated).to.have.lengthOf.below(512);
          chai.expect(updated).to.contain('*CUT*');
        });
      });

      context('/calculate delta of prices', () => {
        const prices1 = { total: 40.50 };
        const prices2 = { total: 35.50, base: 40.50 };
        let cs;

        beforeEach(function () {
          const priceDescriber = new Map();
          priceDescriber.getShoppingCartDescribedPrices = priceDescriber.get.bind(priceDescriber);
          priceDescriber.setShoppingCartDescribedPrices = priceDescriber.set.bind(priceDescriber);
          const CouponSignal = this.module().default;
          cs = new CouponSignal(priceDescriber);
        });

        it('/from no prices to some prices (only total)', () => {
          const s = cs._onCouponPrices(prices1, 'oid');

          chai.expect(s).eq('{D40.50}');
        });

        it('/from no prices to some prices (both total and base)', () => {
          const s = cs._onCouponPrices(prices2, 'oid');

          chai.expect(s).eq('{D35.50/40.50}');
        });

        it('/store prices, make zero delta', () => {
          cs._onCouponPrices(prices1, 'oid');

          const s = cs._onCouponPrices(prices1, 'oid');

          chai.expect(s).eq('Z');
        });

        it('/store prices, make delta (only total)', () => {
          cs._onCouponPrices({ total: 30.00 }, 'oid');

          const s = cs._onCouponPrices(prices1, 'oid');

          chai.expect(s).eq('{D10.50}');
        });

        it('/store prices, make delta (both total and base)', () => {
          cs._onCouponPrices({ total: 30.00, base: 33.00 }, 'oid');

          const s = cs._onCouponPrices(prices2, 'oid');

          chai.expect(s).eq('{D5.50/7.50}');
        });
      });
    });
  });
