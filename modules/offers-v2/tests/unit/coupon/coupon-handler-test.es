/* global chai */
/* global describeModule */
/* global sinon */
const commonMocks = require('../utils/common');
const persistenceMocks = require('../utils/persistence');
const fixture = require('../utils/offers/data');

export default describeModule('offers-v2/coupon/coupon-handler',
  () => ({
    ...commonMocks,
    ...persistenceMocks,
  }),
  () => {
    describe('coupon-handler', function () {
      context('/integration-style', () => {
        let bg;
        let Offer;

        beforeEach(async function () {
          persistenceMocks.lib.reset();
          Offer = (await this.system.import('offers-v2/offers/offer')).default;
          bg = (await this.system.import('offers-v2/background')).default;
          await bg.init();
          //
          // Have one offer
          //
          const offer = new Offer(fixture.VALID_OFFER_OBJ);
          await bg.offersAPI.pushOffer(offer);
          await bg.signalsHandler.flush();
        });

        afterEach(async () => {
          await bg.unload();
        });

        function extractCouponSignalData(httpPostMock, signalName) {
          const sentSignals = httpPostMock.args.map(args => JSON.parse(args[2]));
          const wantSignals = sentSignals.filter(sig => sig.signal_id === 'cid_1');
          chai.expect(wantSignals, 'signal is sent').to.have.lengthOf(1);
          const offers = wantSignals[0].payload.data.c_data.offers;
          chai.expect(offers, 'one offer in the signals').to.have.lengthOf(1);
          const trigger = offers[0].offer_data.filter(origin => origin.origin === 'trigger');
          chai.expect(trigger, 'origin `trigger`').to.have.lengthOf(1);
          return trigger[0].origin_data[signalName];
        }

        async function messageToPopupNotification(msgName, data) {
          const offerInfo = { pattern: fixture.VALID_OFFER_COUPON_URL_PATTERN };
          return bg.events[`popup-notification:${msgName}`]({
            target: 'offers-v2',
            data: {
              ...data,
              url: 'https://cliqz.com/',
              back: offerInfo
            }
          });
        }

        it('/send the coupon journey on purchase', async () => {
          //
          // Arrange
          //
          const httpPostMock = sinon.spy(bg.signalsHandler.sender, 'httpPost');
          const offerInfo = { pattern: fixture.VALID_OFFER_COUPON_URL_PATTERN };
          //
          // Journey: page loaded
          //
          await bg.actions.couponFormUsed({ type: 'coupon_form_not_found', offerInfo });
          await messageToPopupNotification('log', { type: 'pre-show', ok: false });
          await bg.actions.couponFormUsed({ type: 'coupon_form_found', offerInfo });
          await messageToPopupNotification('log', { type: 'pre-show', ok: true });
          await bg.events['popup-notification:log']({ target: 'offers-v2', data: { type: 'pre-show', ok: true, url: 'https://cliqz.com/', offerInfo } });
          await bg.actions.couponFormUsed({
            type: 'coupon_form_prices',
            offerInfo,
            couponValue: { total: 22.22 },
          });
          //
          // Journey: apply empty coupon, then other coupon, fail for too small value
          //
          await bg.actions.couponFormUsed({ type: 'coupon_submitted', offerInfo, couponValue: '' });
          await bg.actions.couponFormUsed({ type: 'coupon_submitted', offerInfo, couponValue: 'NotOurCoupon' });
          await bg.actions.couponFormUsed({ type: 'coupon_fail_minimal_basket_value', offerInfo });
          await bg.actions.couponFormUsed({
            type: 'coupon_form_prices',
            offerInfo,
            couponValue: { total: 22.22 },
          });
          //
          // Journey: apply our coupon, with success
          //
          await messageToPopupNotification('pop', { ok: true });
          const ownCoupon = fixture.VALID_OFFER_OBJ.ui_info.template_data.code;
          await bg.actions.couponFormUsed({ type: 'coupon_submitted', offerInfo, couponValue: ownCoupon });
          await bg.actions.couponFormUsed({
            type: 'coupon_form_prices',
            offerInfo,
            couponValue: { total: 19.50, base: 22.22 },
          });

          //
          // Assert: signal is sent
          //
          await bg.signalsHandler.flush();
          const journeySignal = extractCouponSignalData(httpPostMock, 'coupon_journey');
          chai.expect(journeySignal).to.be.eq('NnFf{D22.22}CCMZyY{D-2.72/22.22}');
        });

        it('/send signals coupon_own_used and coupon_other_used', async () => {
          //
          // Arrange
          //
          const httpPostMock = sinon.spy(bg.signalsHandler.sender, 'httpPost');
          const offerInfo = { pattern: fixture.VALID_OFFER_COUPON_URL_PATTERN };

          //
          // Act
          //
          await bg.actions.couponFormUsed({ type: 'coupon_submitted', offerInfo, couponValue: 'NotOurCoupon' });
          const ownCoupon = fixture.VALID_OFFER_OBJ.ui_info.template_data.code;
          await bg.actions.couponFormUsed({ type: 'coupon_submitted', offerInfo, couponValue: ownCoupon });

          //
          // Assert: signal is sent
          //
          await bg.signalsHandler.flush();
          const ownUsed = extractCouponSignalData(httpPostMock, 'coupon_own_used');
          const otherUsed = extractCouponSignalData(httpPostMock, 'coupon_other_used');
          chai.expect(ownUsed, 'signal coupon_own_used is sent').to.eq(1);
          chai.expect(otherUsed, 'signal coupon_other_used is sent').to.eq(1);
        });

        context('/calculate delta of prices', () => {
          const prices1 = { total: 40.50 };
          const prices2 = { total: 35.50, base: 40.50 };
          let onCouponPrices;

          beforeEach(() => {
            onCouponPrices = bg.couponHandler._onCouponPrices.bind(bg.couponHandler);
          });

          it('/from no prices to some prices (only total)', () => {
            const s = onCouponPrices(prices1, fixture.VALID_OFFER_OBJ.offer_id);

            chai.expect(s).eq('{D40.50}');
          });

          it('/from no prices to some prices (both total and base)', () => {
            const s = onCouponPrices(prices2, fixture.VALID_OFFER_OBJ.offer_id);

            chai.expect(s).eq('{D35.50/40.50}');
          });

          it('/store prices, make zero delta', () => {
            onCouponPrices(prices1, fixture.VALID_OFFER_OBJ.offer_id);

            const s = onCouponPrices(prices1, fixture.VALID_OFFER_OBJ.offer_id);

            chai.expect(s).eq('Z');
          });

          it('/store prices, make delta (only total)', () => {
            onCouponPrices({ total: 30.00 }, fixture.VALID_OFFER_OBJ.offer_id);

            const s = onCouponPrices(prices1, fixture.VALID_OFFER_OBJ.offer_id);

            chai.expect(s).eq('{D10.50}');
          });

          it('/store prices, make delta (both total and base)', () => {
            onCouponPrices({ total: 30.00, base: 33.00 }, fixture.VALID_OFFER_OBJ.offer_id);

            const s = onCouponPrices(prices2, fixture.VALID_OFFER_OBJ.offer_id);

            chai.expect(s).eq('{D5.50/7.50}');
          });
        });
      });
    });
  });
