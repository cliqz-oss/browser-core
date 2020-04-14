/* global chai */
/* global describeModule */
/* eslint-disable no-param-reassign */

const { VALID_OFFER_OBJ } = require('../utils/offers/data');
const commonMocks = require('../utils/common');

const cloneObject = obj => JSON.parse(JSON.stringify(obj));
const cloneOffer = (offer = VALID_OFFER_OBJ) => cloneObject(offer);

export default describeModule('offers-v2/offers/offer-collection',
  () => ({
    ...commonMocks
  }),
  () => {
    describe('/isOfferCollection', () => {
      let isOfferCollection;

      beforeEach(function () {
        isOfferCollection = this.module().isOfferCollection;
      });

      it('is a function', () => {
        chai.expect(typeof isOfferCollection).to.equal('function');
      });

      it('returns `false` when given any type other than an OfferCollection', () => {
        const inputs = [
          undefined, null, true, NaN, 42, 'foo', new Date(), new RegExp('foo'), () => 42, {}
        ];
        const outputs = inputs.map(isOfferCollection);
        chai.expect(outputs.some(Boolean)).to.equal(false);
      });
    });

    describe('/OfferCollection (default export)', () => {
      let OfferCollection;
      let isOfferCollection;
      let Offer;

      beforeEach(async function () {
        OfferCollection = this.module().default;
        isOfferCollection = this.module().isOfferCollection;
        Offer = (await this.system.import('offers-v2/offers/offer')).default;
      });

      const getOfferMonitorData = ({ monitorData }) => monitorData;
      const setOfferID = (offer, offerID) => { offer.offer_id = offerID; };
      const setOfferCampaignID = (offer, campaignID) => { offer.campaign_id = campaignID; };
      const getMonitorSignalID = ({ signalID }) => signalID;
      const setMonitorSignalID = (monitor, signalID) => { monitor.signalID = signalID; };
      const hasMonitorSignalID = signalID =>
        monitor => getMonitorSignalID(monitor) === signalID;

      function buildOffer(offerID, campaignID) {
        const offer = cloneOffer();
        if (offerID) { setOfferID(offer, offerID); }
        if (campaignID) { setOfferCampaignID(offer, campaignID); }
        return new Offer(offer);
      }

      it('is a function', () => {
        chai.expect(typeof OfferCollection).to.equal('function');
      });

      it(`when given a list of offers and optionally a best offer, it returns an object
that asserts \`true\` when tested with \`isOfferCollection\``, () => {
        const offer = buildOffer('o1', 'cid1');
        const inputs = [
          [],
          [offer],
          [offer, buildOffer('o2', 'cid2')]
        ]
          .flatMap(offers => [[offers], [offers, offer]]); // without and with best offer

        const outputs = inputs
          .map(args => new OfferCollection(...args))
          .map(isOfferCollection);

        chai.expect(outputs.every(Boolean)).to.equal(true);
      });

      describe('/OfferCollection instance', () => {
        let bestOffer;
        beforeEach(() => {
          bestOffer = buildOffer('best-offer', 'cid');
        });

        describe('/getBestOffer method', () => {
          it(`returns the collection's best offer supplied at instantiation,
either as additional argument or as first element of the provided array of offers`, () => {
            const offer = buildOffer('o', 'cid');
            const offerCollections = [
              [[bestOffer, offer]],
              [[offer], bestOffer],
              [[offer, bestOffer], bestOffer]
            ]
              .map(args => new OfferCollection(...args));

            const outputs = offerCollections.map(collection => collection.getBestOffer());

            chai.expect(outputs).to.deep.equal([bestOffer, bestOffer, bestOffer]);
          });
        });

        describe('/getLength method', () => {
          it('returns the length of the underlying collection of offers', () => {
            const offerCollections = [
              [],
              [bestOffer],
              [bestOffer, buildOffer('o2', 'cid2')]
            ]
              .map(offers => new OfferCollection(offers));

            const outputs = offerCollections.map(collection => collection.getLength());

            chai.expect(outputs).to.deep.equal([0, 1, 2]);
          });
        });

        describe('/isEmpty method', () => {
          it('returns `true` only when the underlying collection of offers is empty', () => {
            const offerCollections = [
              [],
              [bestOffer],
              [bestOffer, buildOffer('o2', 'cid2')]
            ]
              .map(offers => new OfferCollection(offers));

            const outputs = offerCollections.map(collection => collection.isEmpty());

            chai.expect(outputs).to.deep.equal([true, false, false]);
          });
        });

        describe('/hasSingleEntry method', () => {
          it('returns `true` only when the underlying collection of offers has exactly one entry',
            () => {
              const offerCollections = [
                [],
                [bestOffer],
                [bestOffer, buildOffer('o2', 'cid2')]
              ]
                .map(offers => new OfferCollection(offers));

              const outputs = offerCollections.map(collection => collection.hasSingleEntry());

              chai.expect(outputs).to.deep.equal([false, true, false]);
            });
        });

        describe('/hasMultipleEntries method', () => {
          it(
            'returns `true` only when the underlying collection of offers has more than one entry',
            () => {
              const offerCollections = [
                [],
                [bestOffer],
                [bestOffer, buildOffer('o2', 'cid2')]
              ]
                .map(offers => new OfferCollection(offers));

              const outputs = offerCollections.map(collection => collection.hasMultipleEntries());

              chai.expect(outputs).to.deep.equal([false, false, true]);
            }
          );
        });

        describe('/getOffers method', () => {
          it('returns the offers from the underlying collection of offers', () => {
            const offersLists = [
              [],
              [bestOffer],
              [bestOffer, buildOffer('o2', 'cid2')]
            ];
            const offerCollections = offersLists
              .map(offers => new OfferCollection(offers));

            const outputs = offerCollections.map(collection => collection.getOffers());

            chai.expect(outputs).to.deep.equal(offersLists);
          });
        });

        describe('/values method', () => {
          it(`when called without argument, returns an iterator
over the { offer, group } entries of the underlying collection`, () => {
            const offer1 = buildOffer('o1', 'cid1');
            const monitor = getOfferMonitorData(offer1).find(hasMonitorSignalID('success'));
            setMonitorSignalID(monitor, 'page_imp');

            const offers = [
              offer1,
              buildOffer('o2', 'cid2'),
              buildOffer('o3', 'cid3')
            ];
            const offerCollection = new OfferCollection(offers);

            const result = offerCollection.values();

            chai.expect(typeof result.next).to.equal('function');
            chai.expect([...result]).to.deep.equal([
              { offer: offer1, group: '441084976' },
              { offer: offers[1], group: 'cid2' },
              { offer: offers[2], group: 'cid3' },
            ]);
          });
        });
      });
    });
  });
