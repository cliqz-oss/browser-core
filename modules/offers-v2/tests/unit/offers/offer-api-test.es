/* global chai */
/* global describeModule */
/* global require */
/* eslint no-param-reassign: off */

const commonMocks = require('../utils/common');
const persistenceMocks = require('../utils/persistence');
const eventsMock = require('../utils/events');
const signalsMock = require('../utils/offers/signals');
const VALID_OFFER_OBJ = require('../utils/offers/data').VALID_OFFER_OBJ;

const CH = 'offers-send-ch';

export default describeModule('offers-v2/offers/offers-api',
  () => ({
    ...commonMocks,
    ...persistenceMocks,
    ...eventsMock,
    ...signalsMock,
  }),
  () => {
    describe('OffersAPI', function () {
      let OfferProcessor;
      let OfferDB;
      const events = eventsMock['core/events'].default;
      const SignalHandler = signalsMock['offers-v2/signals/signals_handler'].default;
      let ActionID;
      let Offer;

      beforeEach(function () {
        OfferProcessor = this.module().default;
        events.clearAll();
        persistenceMocks['core/persistence/map'].reset();
        return Promise.all([
          this.system.import('offers-v2/offers/offers-db'),
          this.system.import('offers-v2/offers/actions-defs'),
          this.system.import('offers-v2/offers/offer')]).then((mod) => {
          OfferDB = mod[0].default;
          ActionID = mod[1].default;
          Offer = mod[2].default;
        });
      });

      describe('#offers-api', function () {
        context('basic checks', function () {
          // the offerDB
          let db;
          // the offer processor instance
          let op;
          // the sighandler instance of the offer processor
          let sigh;
          // the filtering rule evaluator moc
          beforeEach(function () {
            db = new OfferDB({ get: () => Promise.resolve({}) });
            sigh = new SignalHandler(db);
            op = new OfferProcessor(sigh, db);
            // clear all
            events.clearAll();
          });

          function cloneValidOffer() {
            return JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
          }

          function bo(offerData) {
            return new Offer(offerData);
          }

          it('check instances exists', function () {
            chai.expect(db).to.exist;
            chai.expect(op).to.exist;
            chai.expect(sigh).to.exist;
          });

          it('cannot add invalid offers', function () {
            chai.expect(op.pushOffer(null)).to.be.equal(false);
            chai.expect(op.pushOffer(undefined)).to.be.equal(false);
            chai.expect(op.pushOffer(bo({}))).to.be.equal(false);
          });

          it('cannot add offer without required fields missing', function () {
            // no offer id
            let offer = cloneValidOffer();
            delete offer.offer_id;
            chai.expect(op.pushOffer(bo(offer))).to.be.equal(false);

            // no campaign id
            offer = cloneValidOffer();
            delete offer.campaign_id;
            chai.expect(op.pushOffer(bo(offer))).to.be.equal(false);

            // not display id
            offer = cloneValidOffer();
            delete offer.display_id;
            chai.expect(op.pushOffer(bo(offer))).to.be.equal(false);
          });

          // check adding invalid offer doesnt emit any event nor signal?
          it('invalid offer doesnt emit any event', function () {
            // no offer id
            const offer = cloneValidOffer();
            delete offer.offer_id;
            chai.expect(op.pushOffer(bo(offer))).to.be.equal(false);
            chai.expect(events.countMsgs(CH)).to.be.equal(0);
          });

          // TODO: check that no signals are sent to the signals handler neither?

          // check can add offer
          it('valid offer can be added', function () {
            const offer = cloneValidOffer();
            chai.expect(op.pushOffer(bo(offer))).to.be.equal(true);
          });

          // check adding offer got proper event
          it('valid offer added emit proper events', function () {
            const offer = cloneValidOffer();
            chai.expect(op.pushOffer(bo(offer))).to.be.equal(true);
            chai.expect(events.countMsgs(CH)).to.be.equal(1);
            const msg = events.msgs[CH][0];
            chai.expect(msg.type).to.be.equal('push-offer');
            chai.expect(msg.origin).to.be.equal('offers-core');
            chai.expect(msg.data.offer_id).to.be.equal(offer.offer_id);
            // do a proper check here that the data is the same? but can be that
            // we actually add more information to the offer so this is not 100% true
            // we should check that offer is inside of msg.data.offer_data
            chai.expect(msg.data.offer_data).to.exist;
          });

          // TODO: check removing an offer is properly implemented

          // check signals
          // check offer triggered signal is properly sent
          it('signal offer triggered is not emitted on invalid offer', function () {
            const offer = cloneValidOffer();
            delete offer.offer_id;
            chai.expect(sigh.getCampaignSignalsCount()).to.be.equal(0);
            chai.expect(sigh.getActionSignalCount()).to.be.equal(0);
            chai.expect(op.pushOffer(bo(offer))).to.be.equal(false);
            chai.expect(sigh.getCampaignSignalsCount()).to.be.equal(0);
            chai.expect(sigh.getActionSignalCount()).to.be.equal(0);
          });

          it('signal offer triggered is emitted on proper offer', function () {
            const offer = cloneValidOffer();
            chai.expect(sigh.getCampaignSignalsCount()).to.be.equal(0);
            chai.expect(sigh.getActionSignalCount()).to.be.equal(0);
            chai.expect(op.pushOffer(bo(offer))).to.be.equal(true);
            chai.expect(sigh.getCampaignSignalsCount()).to.be.equal(1);
            chai.expect(sigh.getActionSignalCount()).to.be.equal(0);
            const sigVal = sigh.getCampaignSignal(offer.campaign_id,
              offer.offer_id,
              'processor',
              ActionID.AID_OFFER_TRIGGERED);
            chai.expect(sigVal).to.be.equal(1);
          });

          context('offers are empty', function () {
            it('getStoredOffers should return []', function () {
              const r = op.getStoredOffers({});
              chai.expect(r).to.be.eql([]);
            });
          });

          context('offer exists', function () {
            beforeEach(function () {
              const offer = cloneValidOffer();
              op.pushOffer(bo(offer));
            });

            it('getStoredOffers should return offers', function () {
              const r = op.getStoredOffers({});
              chai.expect(r.length).to.be.equal(1);
            });

            it('getStoredOffers should [] because of filters', function () {
              const r = op.getStoredOffers({ filters: { by_rs_dest: 'foo_bar filter' } });
              chai.expect(r.length).to.be.equal(0);
            });
          });

          context('push the same offer twice', function () {
            let o1;
            let o2;
            beforeEach(function () {
              const offer = cloneValidOffer();
              o1 = bo(offer);
              o2 = bo(offer);
              op.pushOffer(o1);
              op.pushOffer(o2);
            });

            it('offers should have the same version', function () {
              chai.expect(o1.version).to.be.equal(o2.version);
            });

            it('getStoredOffers should return one offer', function () {
              const r = op.getStoredOffers({});
              chai.expect(r.length).to.be.equal(1);
            });
          });

          context('push the same offer twice but different versions', function () {
            let o1;
            let o2;
            beforeEach(function () {
              const offer = cloneValidOffer();
              o1 = bo(offer);
              o2 = bo({ ...offer, version: `${+Date.now()}` });
              op.pushOffer(o1);
              op.pushOffer(o2);
            });

            it('offer\'s version should change', function () {
              const r = op.getStoredOffers({});
              chai.expect(o1.version).to.be.not.equal(o2.version);
              chai.expect(r[0].offer_info.version).to.be.equal(o2.version);
            });
          });

          context('offer exists and will be removed', function () {
            let removed;
            beforeEach(function () {
              const offer = cloneValidOffer();
              op.pushOffer(bo(offer));
              removed = op._removeOffer(offer.campaign_id, offer.offer_id);
            });

            it('offer should be removed and offers now empty', function () {
              const r = op.getStoredOffers({});
              chai.expect(removed).to.be.equal(true);
              chai.expect(r.length).to.be.equal(0);
            });
          });

          // TODO: check removed offer sent AID_OFFER_DB_REMOVED signal

          // check display offer

          // check the different APIs get methods

          // do more complex tests sending signals from outside sending messages
          // and getting the responses
        });
      });
    });
  });
