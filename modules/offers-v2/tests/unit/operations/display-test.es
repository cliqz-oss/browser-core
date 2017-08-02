/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names,prefer-arrow-callback,arrow-body-style */

export default describeModule('offers-v2/operations/display',
  () => ({
  }),
  () => {
    describe('/display operations', () => {
      let ops;
      let eventLoop;
      let resultHookedFunc;

      function mockEventLoop(obj) {
        eventLoop = obj;
      }

      function hookedFunc(...args) {
        resultHookedFunc = args;
      }

      beforeEach(function () {
        ops = this.module().default;
      });

      /**
       * ==================================================
       * $show_offer operation tests
       * ==================================================
       */
      describe('/show_offer', () => {
        let op;
        beforeEach(function () {
          op = ops.$show_offer;
        });

        it('/push offer', () => {
          mockEventLoop({
            environment: {
              pushOffer: (offerId, ruleInfo) => {
                hookedFunc(offerId, ruleInfo);
                return true;
              }
            }
          });

          const offerInfo = {
            rule_info: {
              type: 'exact_match',
              url: ['https://www.amazon.de']
            },
            offer_id: 'HC1234'
          };

          return Promise.all([
            op.call(this, ['https://www.amazon.de', offerInfo], eventLoop).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc.length).eql(2);
                chai.expect(resultHookedFunc).eql([offerInfo,
                                                   { type: 'exact_match', url: ['https://www.amazon.de'] }]);
              },
              (error) => {
                chai.assert.fail(error, true, error);
              }
            ),
          ]);
        });

        it('/push offer updates rule info', () => {
          mockEventLoop({
            environment: {
              pushOffer: (offerId, ruleInfo) => {
                hookedFunc(offerId, ruleInfo);
                return true;
              }
            }
          });

          const offerInfo = {
            rule_info: {
              type: 'exact_match',
              url: ['https://www.amazon.de']
            },
            offer_id: 'HC1234'
          };
          const offerInfoExpected = {
            rule_info: {
              type: 'exact_match',
              url: ['https://www.amazon.de2']
            },
            offer_id: 'HC1234'
          };

          return Promise.all([
            op.call(this, ['https://www.amazon.de2', offerInfo], eventLoop).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc.length).eql(2);
                chai.expect(resultHookedFunc).eql([offerInfoExpected,
                                                   { type: 'exact_match', url: ['https://www.amazon.de2'] }]);
              },
              (error) => {
                chai.assert.fail(error, true, error);
              }
            ),
          ]);
        });

        it('/push offer failed', () => {
          mockEventLoop({
            environment: {
              pushOffer: (offerInfo) => {
                hookedFunc(offerInfo);
                return false;
              },
            }
          });

          return Promise.all([
            op.call(this, ['https://www.amazon.de', { rule_info: {}, offer_id: 'HC1234' }], eventLoop).then(
              (result) => {
                chai.expect(result).eql(false);
              },
              (error) => {
                chai.assert.fail(error, false, error);
              }
            ),
          ]);
        });
      });

      /**
       * ==================================================
       * offer_added operation tests
       * ==================================================
       */
      describe('/offer_added', () => {
        let op;
        beforeEach(function () {
          op = ops.$offer_added;
        });

        it('/nonexist offer', () => {
          mockEventLoop({
            environment: {
              getOfferLastUpdate: (offerId, signalName) => null
            }
          });

          return Promise.all([
            op.call(this, ['OFFER-1234', 1800], eventLoop).then(
              (result) => {
                chai.expect(result).eql(false);
              },
              (error) => {
                chai.assert.fail(error, false, error);
              }
            ),
          ]);
        });

        it('/within 30 minutes', () => {
          mockEventLoop({
            environment: {
              getOfferLastUpdate: (offerId, signalName) => (Date.now() - 29*60*1000)
            }
          });

          return Promise.all([
            op.call(this, ['OFFER-1234', 30*60], eventLoop).then(
              (result) => {
                chai.expect(result).eql(true);
              },
              (error) => {
                chai.assert.fail(error, true, error);
              }
            ),
          ]);
        });

        it('/not within 30 minutes', () => {
          mockEventLoop({
            environment: {
              getOfferLastUpdate: (offerId, signalName) => (Date.now() - 31*60*1000)
            }
          });

          return Promise.all([
            op.call(this, ['OFFER-1234', 30 * 60], eventLoop).then(
              (result) => {
                chai.expect(result).eql(false);
              },
              (error) => {
                chai.assert.fail(error, false, error);
              }
            ),
          ]);
        });
      });

      /**
       * ==================================================
       * show_ab_offer operation tests
       * ==================================================
       */
      describe('/show_ab_offer', () => {
        let op;
        beforeEach(function () {
          op = ops.$show_ab_offer;
        });

        it('/invalid arguments', () => {

          return Promise.all([
            op.call(this, ['https://www.amazon.de', []], eventLoop).then(
              (result) => {
                chai.assert.fail(result, 'error', result);
              },
              (error) => {
                chai.expect(error).an('error');
              }
            ),
          ]);
        });

        it('/display offer/choose the first offer', () => {
          mockEventLoop({
            environment: {
              pushOffer: (offerId, ruleInfo) => {
                hookedFunc(offerId, ruleInfo);
                return true;
              },
              getABNumber: () => 4999
            },
          });

          const rule_info = {
            type: 'exact_match',
            url: ['https://www.amazon.de']
          };
          const offersData = [
            { ab_test_info: { pct: 50 }, rule_info, offer_id: 'HC1' },
            { ab_test_info: { pct: 50 }, rule_info, offer_id: 'HC2' },
          ];

          return Promise.all([
            op.call(this, ['https://www.amazon.de', offersData], eventLoop).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc.length).eql(2);
                chai.expect(resultHookedFunc).eql([offersData[0], { type: 'exact_match', url: ['https://www.amazon.de'] }]);
              },
              (error) => {
                chai.assert.fail(error, undefined, error);
              }
            ),
          ]);
        });

        it('/display offer/choose the second offer', () => {
          mockEventLoop({
            environment: {
              pushOffer: (offerId, ruleInfo) => {
                hookedFunc(offerId, ruleInfo);
                return true;
              },
              getABNumber: () => 5000
            },
          });

          const rule_info = {
            type: 'exact_match',
            url: ['https://www.amazon.de']
          };
          const offersData = [
            { ab_test_info: { pct: 50 }, rule_info, offer_id: 'HC1' },
            { ab_test_info: { pct: 50 }, rule_info, offer_id: 'HC2' },
          ];

          return Promise.all([
            op.call(this, ['https://www.amazon.de', offersData], eventLoop).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc.length).eql(2);
                chai.expect(resultHookedFunc).eql([offersData[1], { type: 'exact_match', url: ['https://www.amazon.de'] }]);
              },
              (error) => {
                chai.assert.fail(error, undefined, error);
              }
            ),
          ]);
        });

        it('/display offer/four offers', () => {
          mockEventLoop({
            environment: {
              pushOffer: (offerId, ruleInfo) => {
                hookedFunc(offerId, ruleInfo);
                return true;
              },
              getABNumber: () => 6000
            },
          });

          const rule_info = {
            type: 'exact_match',
            url: ['https://www.amazon.de']
          };
          const offersData = [
            { ab_test_info: { pct: 0.25 }, rule_info: {}, offer_id: 'HC1' },
            { ab_test_info: { pct: 0.25 }, rule_info: {}, offer_id: 'HC2' },
            { ab_test_info: { pct: 0.25 }, rule_info: {}, offer_id: 'HC3' },
            { ab_test_info: { pct: 0.25 }, rule_info: {}, offer_id: 'HC4' },
          ];

          return Promise.all([
            op.call(this, ['https://www.amazon.de', offersData], eventLoop).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc.length).eql(2);
                chai.expect(resultHookedFunc).eql([offersData[2], { type: 'exact_match', url: ['https://www.amazon.de'] }]);
              },
              (error) => {
                chai.assert.fail(error, undefined, error);
              }
            ),
          ]);
        });

      });
    });
  },
);
