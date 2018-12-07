/* global chai */
/* global describeModule */
const commonMocks = require('../utils/common');
const persistenceMocks = require('../utils/persistence');
const VALID_OOTW_OFFER_OBJ = require('../utils/offers/data').VALID_OOTW_OFFER_OBJ;

export default describeModule('offers-v2/offers/best-offer',
  () => ({
    ...commonMocks,
    ...persistenceMocks,
  }),
  () => {
    describe('/best offer selection', function () {
      let Offer;
      let OfferDB;
      let CategoriesMatchTraits;
      let chooseBestOffer;

      beforeEach(async function () {
        chooseBestOffer = (await this.module()).default;
        Offer = (await this.system.import('offers-v2/offers/offer')).default;
        OfferDB = (await this.system.import('offers-v2/offers/offers-db')).default;
        CategoriesMatchTraits = (await this.system.import('offers-v2/categories/category-match')).CategoriesMatchTraits;
      });

      describe('', function () {
        let offers;
        let offerDB;
        let offerWithMaxReward;
        let categoryWeights;
        let categoryMatchTraits;

        function displayCount(offer) {
          return offerDB.getDisplayCount(offer.uniqueID);
        }

        function displayOffers100times() {
          Array(100).fill().forEach(() => {
            const [choosen] = chooseBestOffer(offers, categoryMatchTraits, displayCount);
            offerDB.incOfferAction(choosen.uniqueID, 'offer_shown');
          });
        }

        beforeEach(() => {
          offerDB = new OfferDB();
          offers = [];
          // Category weight is the length of the pattern
          categoryWeights = new Map([['c1', '1'], ['c2', '22'], ['c3', '333']]);
          categoryMatchTraits = new CategoriesMatchTraits(categoryWeights);
          const mkOffer = ([id, reward]) => new Offer({
            offer_id: id,
            displayPriority: reward,
            display_id: id,
            campaign_id: id,
            categories: ['c1'],
            ui_info: {
              template_data: {
                validity: 10000 + (Date.now() / 1000)
              }
            }
          });
          const fixture = [['o10', 10], ['o40', 40], ['o20', 20], ['o30', 30]];
          fixture.forEach((preOffer) => {
            const offer = mkOffer(preOffer);
            offers.push(offer);
            offerDB.addOfferObject(offer.uniqueID, offer.offerObj);
          });
          offerWithMaxReward = offers.filter(o => o.uniqueID === 'o40')[0];
        });

        it('/offer of the week has non-zero score', () => {
          offers = [VALID_OOTW_OFFER_OBJ];
          const [choosen, score] = chooseBestOffer(offers, categoryMatchTraits, displayCount);

          chai.expect(choosen).eq(offers[0]);
          chai.expect(score).be.eq(1);
        });

        it('/max reward when no display-counts at all', () => {
          const [choosen, rpd] = chooseBestOffer(offers, categoryMatchTraits, displayCount);

          chai.expect(choosen).eq(offerWithMaxReward);
          chai.expect(rpd).be.eq(40);
        });

        it('/max reward when reward-display proportions are same', () => {
          displayOffers100times();

          const [choosen, rpd] = chooseBestOffer(offers, categoryMatchTraits, displayCount);

          chai.expect(choosen).eq(offerWithMaxReward);
          chai.expect(rpd).be.eq(1);
        });

        function cnt(offerID) {
          return offerDB.getDisplayCount(offerID);
        }

        it('/distribute display-counts proportionally', () => {
          displayOffers100times();

          chai.expect(cnt('o10')).be.eq(10);
          chai.expect(cnt('o20')).be.eq(20);
          chai.expect(cnt('o30')).be.eq(30);
          chai.expect(cnt('o40')).be.eq(40);
        });

        it('/notify if no offer fits categories', () => {
          const otherCatOffers = offers.map(o => new Offer(
            { ...o.offersObj, categories: ['smth else'] }
          ));

          const [, rpd] = chooseBestOffer(otherCatOffers, categoryMatchTraits, displayCount);

          chai.expect(rpd).be.eq(0);
        });

        // Make scaled rewards be 20, 30, 30, 40
        function recategorizeOffers() {
          offers.filter(o => o.uniqueID === 'o10')[0].offerObj
            .categories = ['c1', 'c2', 'c3'];
          offers.filter(o => o.uniqueID === 'o20')[0].offerObj
            .categories = ['c1', 'c2'];
        }

        it('/offer category weights affect proportions', () => {
          recategorizeOffers();

          displayOffers100times();

          chai.expect(cnt('o10')).be.eq(17);
          chai.expect(cnt('o20')).be.eq(25);
          chai.expect(cnt('o30')).be.eq(25);
          chai.expect(cnt('o40')).be.eq(33);
        });

        it('/environment category weights affect proportions', () => {
          // Make scaled rewards 30, 60, 30, 40
          recategorizeOffers();
          categoryWeights.set('c2', '55555');
          categoryMatchTraits = new CategoriesMatchTraits(categoryWeights);

          displayOffers100times();

          chai.expect(cnt('o10')).be.eq(19);
          chai.expect(cnt('o20')).be.eq(37);
          chai.expect(cnt('o30')).be.eq(19);
          chai.expect(cnt('o40')).be.eq(25);
        });
      });
    });
  });
