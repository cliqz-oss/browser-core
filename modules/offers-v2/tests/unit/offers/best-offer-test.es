/* global chai */
/* global describeModule */
/* global sinon */
const commonMocks = require('../utils/common');
const persistenceMocks = require('../utils/persistence');
const fixture = require('../utils/offers/data');
const {
  activateIntentWithOffers,
  initializeBackground,
  visitPageWithOffer
} = require('../utils/offers/integration');

function p(rawPattern) {
  return [{ rawPattern, tokenCount: rawPattern.length }];
}

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
          return offerDB.getPushCount(offer.uniqueID);
        }

        function displayOffers100times() {
          Array(100).fill().forEach(() => {
            const [choosen] = chooseBestOffer(offers, categoryMatchTraits, displayCount);
            offerDB.incOfferAction(choosen.uniqueID, 'offer_pushed');
          });
        }

        function addOfferByObject(offerObj) {
          const offer = new Offer(offerObj);
          offers.push(offer);
          offerDB.addOfferObject(offer.uniqueID, offer.offerObj);
          return offer;
        }

        function addOfferByReward(oid, reward) {
          const offerObj = {
            offer_id: oid,
            displayPriority: reward,
            display_id: oid,
            campaign_id: oid,
            categories: ['c1'],
            ui_info: {
              template_data: {
                validity: 10000 + (Date.now() / 1000)
              }
            }
          };
          addOfferByObject(offerObj);
        }

        beforeEach(() => {
          offerDB = new OfferDB();
          offers = [];
          // Category `tokenCount` is the length of the pattern
          categoryWeights = new Map([['c1', p('1')], ['c2', p('22')], ['c3', p('333')]]);
          categoryMatchTraits = new CategoriesMatchTraits(categoryWeights);
          const fxt = [['o10', 10], ['o40', 40], ['o20', 20], ['o30', 30]];
          fxt.forEach(([oid, reward]) => addOfferByReward(oid, reward));
          offerWithMaxReward = offers.filter(o => o.uniqueID === 'o40')[0];
        });

        it('/work for zero offers', () => {
          const [, rpd] = chooseBestOffer([], categoryMatchTraits, displayCount);

          chai.expect(rpd).be.eq(0);
        });

        it('/select the only offer when there is only one', () => {
          offers.splice(1, 10);
          const [offer, rpd] = chooseBestOffer(offers, categoryMatchTraits, displayCount);

          chai.expect(offer).be.eq(offers[0]);
          chai.expect(rpd).be.eq(1);
        });

        it('/choose max reward when no display-counts at all', () => {
          const [choosen] = chooseBestOffer(offers, categoryMatchTraits, displayCount);

          chai.expect(choosen).eq(offerWithMaxReward);
        });

        it('/choose max reward when reward-display proportions are same', () => {
          displayOffers100times();

          const [choosen] = chooseBestOffer(offers, categoryMatchTraits, displayCount);

          chai.expect(choosen).eq(offerWithMaxReward);
        });

        function cnt(offerID) {
          return offerDB.getPushCount(offerID);
        }

        function showAllOffersOnce() {
          offers.forEach(offer => offerDB.incOfferAction(offer.uniqueID, 'offer_pushed'));
        }

        it('/distribute display-counts proportionally', () => {
          displayOffers100times();

          chai.expect(cnt('o10')).be.eq(10);
          chai.expect(cnt('o20')).be.eq(20);
          chai.expect(cnt('o30')).be.eq(30);
          chai.expect(cnt('o40')).be.eq(40);
        });

        it('/select an offer of the week', () => {
          offers.splice(1, 1); // 'o40' has too big reward
          showAllOffersOnce();
          addOfferByObject(fixture.VALID_OOTW_OFFER_OBJ);
          const ootwOffer = offers[offers.length - 1];

          const [choosen] = chooseBestOffer(offers, categoryMatchTraits, displayCount);

          chai.expect(choosen).eq(ootwOffer);
        });

        it('/notify if no offer fits categories', () => {
          const otherCatOffers = offers.map(o => new Offer(
            { ...o.offersObj, categories: ['smth else'] }
          ));

          const [, rpd] = chooseBestOffer(otherCatOffers, categoryMatchTraits, displayCount);

          chai.expect(rpd).be.eq(0);
        });

        it('/sum categories weights when offer has several', () => {
          const offerJson = JSON.parse(JSON.stringify(fixture.VALID_OFFER_OBJ));
          offerJson.categories = ['c1', 'c2'];
          offerJson.displayPriority = 1000;
          const multicatOffer = addOfferByObject(offerJson);
          showAllOffersOnce();

          const [choosen, rpd] = chooseBestOffer(offers, categoryMatchTraits, displayCount);

          chai.expect(choosen).to.eq(multicatOffer);
          chai.expect(rpd).be.eq(1000 * (Math.E + (Math.E ** 2)));
        });
      });
    });

    describe('/integration-style for competing offers', () => {
      let bg;
      let Category;
      let Intent;

      beforeEach(async function () {
        persistenceMocks.lib.reset();
        Category = (await this.system.import('offers-v2/categories/category')).default;
        Intent = (await this.system.import('offers-v2/intent/intent')).default;
        bg = await initializeBackground(this.system);
      });

      afterEach(async () => {
        await bg.unload();
      });

      function defineCategory(cid, patternLength) {
        const cat = JSON.parse(JSON.stringify(fixture.VALID_CATEGORY));
        const path = ['level1', 'level2', 'level3'].slice(0, patternLength - 1).join('/');
        const catObj = new Category(
          cid,
          [`||some.com/${path}^$script`],
          cat.version,
          48 * 60 * 60, // timeRangeSecs: 2 days
          cat.activationData
        );
        bg.categoryHandler.addCategory(catObj);
      }

      function defineOffer(collection, oid, cats) {
        const o = JSON.parse(JSON.stringify(fixture.VALID_OFFER_OBJ));
        o.offer_id = oid;
        o.campaign_id = oid;
        o.categories = cats;
        o.filterRules = undefined;
        collection.push(o);
      }

      function countNumberOfPushesPerOffer(pushMock) {
        const stat = {};
        pushMock.args.forEach(([offer]) => {
          const oid = offer.uniqueID;
          stat[oid] = (stat[oid] || 0) + 1;
        });
        return stat;
      }

      it('/proportions are as expected', async () => {
        //
        // Arrange: offers
        //
        defineCategory('c4', 4);
        defineCategory('c3', 3);
        defineCategory('c2', 2);
        bg.categoryHandler.build();
        const offers = [];
        defineOffer(offers, 'o4', ['c4']); // 4-token match
        defineOffer(offers, 'o32', ['c3', 'c2']); // 3-token + 2-token matches
        defineOffer(offers, 'o3', ['c3']); // 3-token match
        defineOffer(offers, 'o2', ['c2']); // 2-token match
        const intent = new Intent('intent1', 48 * 60 * 60);
        activateIntentWithOffers(bg, intent, offers);
        //
        // Arrange: spies
        //
        const pushMock = sinon.spy(bg.offersAPI, 'pushOffer');

        //
        // Act
        //
        for (let i = 0; i < 20; i += 1) {
          // eslint-disable-next-line no-await-in-loop
          await visitPageWithOffer(bg, 'http://some.com/level1/level2/level3');
        }

        //
        // Assert
        //
        const pushes = countNumberOfPushesPerOffer(pushMock);
        const e = Math.E;
        chai.expect(pushes.o4 / pushes.o32).closeTo((e ** 4) / ((e ** 3) + (e ** 2)), 0.2);
        chai.expect(pushes.o32 / pushes.o3).closeTo(((e ** 3) + (e ** 2)) / (e ** 3), 0.2);
        chai.expect(pushes.o3 / pushes.o2).closeTo(e, 0.8);
      });
    });
  });
