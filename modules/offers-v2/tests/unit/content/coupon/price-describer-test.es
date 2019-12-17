/* global chai */
/* global describeModule */
const { JSDOM } = require('jsdom');

export default describeModule('offers-v2/content/coupon/price-describer',
  () => ({
  }),
  () => {
    describe('price describer', function () {
      let extractPrices;
      let describePrices;
      let guessTotal;

      beforeEach(function () {
        extractPrices = this.module()._extractPrices;
        describePrices = this.module().describePrices;
        guessTotal = this.module().guessTotal;
      });

      context('/extract prices', () => {
        it('/collect prices with dots and commas', () => {
          const jsdom = new JSDOM('<div><p><span>11.11</span> <span>2,22</span> not: <span>333.333</span></p> <p><span>44,44</span> <span>55.55</span></p></div>');

          const prices = extractPrices(jsdom.window.document.body);

          chai.expect(prices).to.eql([11.11, 2.22, 44.44, 55.55]);
        });

        it('/ignore number in <script/> tags', () => {
          const jsdom = new JSDOM('<div><p>11.11</p> <script>22.22</script> <p>33.33</p></div>');

          const prices = extractPrices(jsdom.window.document.body);

          chai.expect(prices).to.eql([11.11, 33.33]);
        });

        it('/ignore too big numbers', () => {
          const jsdom = new JSDOM('<p><span>55555.55</span> <span>666666.66</span> <span>11.11</span></p>');

          const prices = extractPrices(jsdom.window.document.body);

          chai.expect(prices).to.eql([55555.55, 11.11]);
        });

        it('/ignore several prices inside one tag', () => {
          const jsdom = new JSDOM('<p>11.11 + 22.22 = 33.33</p>');

          const prices = extractPrices(jsdom.window.document.body);

          chai.expect(prices).to.eql([]);
        });

        it('/ignore dates', () => {
          const jsdom = new JSDOM('<p>30.07.2019</p>');

          const prices = extractPrices(jsdom.window.document.body);

          chai.expect(prices).to.eql([]);
        });

        it('/ignore struck out prices', () => {
          const jsdom = new JSDOM('<p><strike><span>Before: 100.00€</span></strike>, <span>after: 80.00€</span></p>');

          const prices = extractPrices(jsdom.window.document.body);

          chai.expect(prices).to.eql([80.00]);
        });

        it('/regression: re-set matcher between calls to price extractor', () => {
          const jd = new JSDOM('<div><span>aaa 10.10 20.20 bbb</span><span>14.44</span></div>');

          const prices = extractPrices(jd.window.document.body);

          chai.expect(prices).to.eql([14.44]);
        });
      });

      context('/describe prices', () => {
        const jsdom = new JSDOM(`<div>
          <p id="total">Joker total: 6,00€</span></p>
          <p id="confused"><span>Lieferkosten 4.00€</span>, <span>total: 10,00€</span></p>
          <p>Zwischensumme: 50.00€</p> <p>Coupon: 5,00€</p> <p>Gesamtsumme: 45.00€</p>
          </div>`);

        it('/find by explicit selectors', () => {
          const prices = describePrices(jsdom.window, { totalSelector: '#total' });

          chai.expect(prices).to.eql({ total: 6 });
        });

        it('/ignore too wide explicit selectors', () => {
          const prices = describePrices(jsdom.window, { totalSelector: '#confused' });

          chai.expect(prices).to.eql({ total: undefined });
        });

        it('/use heuristics', () => {
          const prices = describePrices(jsdom.window);

          chai.expect(prices).to.eql({ total: 45, base: 50 });
        });

        it('/find multipart price if an explicit selector provided (cyberport)', () => {
          const jd = new JSDOM('<div id="price"> € 164<span class="comma">,</span><sup>90</sup> </div>');

          const prices = describePrices(jd.window, { totalSelector: '#price' });

          chai.expect(prices).to.eql({ total: 164.90 });
        });
      });

      context('/guess price total', () => {
        it('/undefined for empty list', () => {
          const prices = [];

          const guess = guessTotal(prices);

          chai.expect(guess).to.eql({ total: undefined });
        });

        it('/find maximal value', () => {
          const prices = [22.33, 14.02, 99.99, 22.01, 80.00];

          const guess = guessTotal(prices);

          chai.expect(guess).to.eql({ total: 99.99 });
        });

        context('/find the final price if only coupon is given', () => {
          // price 100€, coupon 10€, to pay 90€
          const fixture = [
            ['only with relevant prices', [100.00, 10.00, 90.00]],
            ['with mix of irrelevant prices', [22.33, 14.02, 100.00, 22.01, 10.00, 4.00, 90.00, 4.00]]
          ];
          fixture.forEach(([describe, prices]) => {
            it(describe, () => {
              const guess = guessTotal(prices);

              chai.expect(guess).to.eql({ base: 100.00, total: 90.00 });
            });
          });
        });

        context('/find the final price with delivery costs and coupon', () => {
          // price 100€, delivery cost 4.95€, coupon 10€, to pay 94.95€
          const fixture = [
            ['only with relevant prices', [100.00, 4.95, 10.00, 94.95]],
            ['with mix of irrelevant prices', [22.33, 100.00, 23.12, 4.95, 7.80, 10.00, 31.07, 94.95, 4.00]],
            ['coupon before delivery costs', [100.00, 10.00, 4.95, 94.95]],
          ];
          fixture.forEach(([describe, prices]) => {
            it(describe, () => {
              const guess = guessTotal(prices);

              chai.expect(guess).to.eql({ base: 100.00, total: 94.95 });
            });
          });
        });

        context('/real life examples', () => {
          const fixture = [
            ['mytoys with coupon (no base price)', { total: 44.83 },
              [2.95, 20.99, 20.99, 2.1, 18.89, 22.99, 22.99, 41.88, 2.95, 44.83],
            ],
            [
              'vistaprint with coupon', { base: 130.00, total: 114.98 },
              [4.99, 130, 19.51, 110.49, 17.64, 110.49, 19.51, 4.49,
                18.49, 114.98, 15.99, 5.99, 8.79, 6.99, 8.99],
            ],
            [
              'valmano with coupon 20€ and delivery 5.90€', { base: 449, total: 434.90 },
              [0.21, 449, 434.9, 434.9, 0.21, 449, 0.21, 449, 449, 449, 20, 5.9, 434.9],
            ]
          ];
          fixture.forEach(([describe, expected, prices]) => {
            it(describe, () => {
              const guess = guessTotal(prices);

              chai.expect(guess).to.eql(expected);
            });
          });
        });
      });
    });
  });
