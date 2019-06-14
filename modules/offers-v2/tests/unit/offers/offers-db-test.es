/* global chai */
/* global describeModule */
/* global require */
/* global sinon */
const commonMocks = require('../utils/common');
const persistenceMocks = require('../utils/persistence');
const VALID_OFFER_OBJ = require('../utils/offers/data').VALID_OFFER_OBJ;
const waitFor = require('../utils/waitfor');

let mockedTS = Date.now();
function mockCurrentTS(ts) {
  mockedTS = ts;
}

const getEmptyOfferDB = persistenceMocks.lib.getEmptyOfferDB;

export default describeModule('offers-v2/offers/offers-db',
  () => ({
    ...commonMocks,
    ...persistenceMocks,
    'offers-v2/utils': {
      timestampMS: () => mockedTS
    },
  }),
  () => {
    describe('OffersDB', function () {
      let OffersDB;
      let Offer;
      let OffersConfigs;

      function getCopyValidOffer() {
        return JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
      }

      async function waitForDBLoaded(db) {
        await db.loadPersistentData();
      }

      beforeEach(async function () {
        OffersDB = this.module().default;
        OffersConfigs = (await this.system.import('offers-v2/offers_configs')).default;
        Offer = (await this.system.import('offers-v2/offers/offer')).default;
        mockCurrentTS(Date.now());
      });

      function genOffers(data) {
        const result = [];
        data.forEach((o) => {
          const offer = getCopyValidOffer();
          offer.offer_id = o.id;
          if (o.client_id) {
            offer.client_id = o.client_id;
          }
          if (o.types) {
            offer.types = o.types;
          }
          if (o.abTestInfo) {
            offer.abTestInfo = o.abTestInfo;
          }
          result.push(offer);
        });
        return result;
      }

      describe('#offerObject', function () {
        context('invalid offer object', function () {
          let db;
          let offerObj;

          beforeEach(function () {
            persistenceMocks['core/persistence/map'].reset();
            db = new OffersDB({});
            offerObj = JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
          });

          it('no display id', function () {
            delete offerObj.display_id;
            chai.expect(db.addOfferObject('x', offerObj)).to.equal(false);
            chai.expect(db.getOfferMeta('x')).to.not.exist;
          });

          it('no campaign_id', function () {
            delete offerObj.campaign_id;
            chai.expect(db.addOfferObject('x', offerObj)).to.equal(false);
            chai.expect(db.getOfferMeta('x')).to.not.exist;
          });

          it('no offer id', function () {
            delete offerObj.offer_id;
            chai.expect(db.addOfferObject('x', offerObj)).to.equal(false);
            chai.expect(db.getOfferMeta('x')).to.not.exist;
          });
        });

        context('valid offer object', function () {
          let db;
          let offerObj;

          beforeEach(function () {
            persistenceMocks['core/persistence/map'].reset();
            db = new OffersDB({});
            offerObj = JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
          });

          it('offer added properly', function () {
            chai.expect(db.addOfferObject('x', offerObj)).to.equal(true);
            const offerMeta = db.getOfferMeta('x');
            chai.expect(offerMeta).to.exist;
            chai.expect(offerMeta.c_ts).to.be.at.most(Date.now());
            chai.expect(offerMeta.l_u_ts).to.be.at.most(Date.now());
          });

          it('cannot remove non-exist offer', function () {
            chai.expect(db.removeOfferObject('x')).to.equal(false);
          });

          it('offer added and removed properly', function () {
            chai.expect(db.addOfferObject('x', offerObj)).to.equal(true);
            chai.expect(db.removeOfferObject('x')).to.equal(true);
          });

          it('campaign id is proper', function () {
            chai.expect(db.addOfferObject('x', offerObj)).to.equal(true);
            chai.expect(db.getCampaignID('x')).to.equal(offerObj.campaign_id);
          });

          it('changing offer doesnt change offerDB', function () {
            chai.expect(db.addOfferObject('x', offerObj)).to.equal(true);
            offerObj.offer_id = 'm';
            offerObj.campaign_id = 'something_else';
            chai.expect(db.getCampaignID('x')).to.equal('cid_1');
          });

          it('adding same offer fail', function () {
            chai.expect(db.addOfferObject('x', offerObj)).to.equal(true);
            chai.expect(db.addOfferObject('x', offerObj)).to.equal(false);
          });
        });

        context('action', function () {
          let db;
          let offerObj;

          beforeEach(function () {
            persistenceMocks['core/persistence/map'].reset();
            db = new OffersDB({});
            offerObj = JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
          });

          it('to non existing offer', function () {
            chai.expect(db.incOfferAction('x', 'h1')).to.equal(false);
            chai.expect(db.getOfferActionMeta('x', 'h1')).to.not.exist;
          });

          it('to existing offer', function () {
            const addedTS = Date.now();
            const actionTS = addedTS + (60 * 1000);
            const action2ndTS = addedTS + (120 * 1000);

            mockCurrentTS(addedTS);
            chai.expect(db.addOfferObject('x', offerObj)).to.equal(true);
            chai.expect(db.getOfferActionMeta('x', 'h1')).to.not.exist;
            mockCurrentTS(actionTS);
            chai.expect(db.incOfferAction('x', 'h1')).to.equal(true);
            let action = db.getOfferActionMeta('x', 'h1');
            chai.expect(action).to.exist;
            chai.expect(action.count).to.equal(1);
            chai.expect(action.c_ts).eql(actionTS);
            chai.expect(action.l_u_ts).eql(actionTS);

            // inc again
            mockCurrentTS(action2ndTS);
            chai.expect(db.incOfferAction('x', 'h1')).to.equal(true);
            action = db.getOfferActionMeta('x', 'h1');
            chai.expect(action.count).to.equal(2);
            chai.expect(action.c_ts).eql(actionTS);
            chai.expect(action.l_u_ts).eql(action2ndTS);
          });

          it('using counter to existing offer', function () {
            const addedTS = Date.now();
            const actionTS = addedTS + (60 * 1000);
            const action2ndTS = addedTS + (120 * 1000);

            mockCurrentTS(addedTS);
            chai.expect(db.addOfferObject('x', offerObj)).to.equal(true);
            chai.expect(db.getOfferActionMeta('x', 'h1')).to.not.exist;
            mockCurrentTS(actionTS);
            chai.expect(db.incOfferAction('x', 'h1', true, 100)).to.equal(true);
            let action = db.getOfferActionMeta('x', 'h1');
            chai.expect(action).to.exist;
            chai.expect(action.count).to.equal(100);
            chai.expect(action.c_ts).eql(actionTS);
            chai.expect(action.l_u_ts).eql(actionTS);

            // inc again
            mockCurrentTS(action2ndTS);
            chai.expect(db.incOfferAction('x', 'h1')).to.equal(true);
            action = db.getOfferActionMeta('x', 'h1');
            chai.expect(action.count).to.equal(101);
            chai.expect(action.c_ts).eql(actionTS);
            chai.expect(action.l_u_ts).eql(action2ndTS);
          });

          it('display id action', function () {
            const addedTS = Date.now();
            const actionTS = addedTS + (60 * 1000);
            const action2ndTS = addedTS + (120 * 1000);

            const offerObj2 = JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
            offerObj2.offer_id = 'y';

            mockCurrentTS(addedTS);
            chai.expect(db.addOfferObject('x', offerObj)).to.equal(true);
            chai.expect(db.addOfferObject('y', offerObj2)).to.equal(true);

            chai.expect(db.getOfferActionMeta('x', 'h1')).to.not.exist;
            chai.expect(db.getOfferDisplayActionMeta(offerObj.display_id, 'h1')).to.not.exist;

            mockCurrentTS(actionTS);
            chai.expect(db.incOfferAction('x', 'h1')).to.equal(true);
            chai.expect(db.getOfferActionMeta('x', 'h1').count).to.equal(1);
            chai.expect(db.getOfferActionMeta('y', 'h1')).to.not.exist;

            let dAction = db.getOfferDisplayActionMeta(offerObj.display_id, 'h1');
            chai.expect(dAction.count).to.equal(1);
            chai.expect(dAction.c_ts).eql(actionTS);
            chai.expect(dAction.l_u_ts).eql(actionTS);

            // inc again
            mockCurrentTS(action2ndTS);
            chai.expect(db.incOfferAction('y', 'h1')).to.equal(true);
            chai.expect(db.getOfferActionMeta('x', 'h1').count).to.equal(1);
            chai.expect(db.getOfferActionMeta('y', 'h1').count).to.equal(1);

            dAction = db.getOfferDisplayActionMeta(offerObj.display_id, 'h1');
            chai.expect(dAction.count).to.equal(2);
            chai.expect(dAction.c_ts).eql(actionTS);
            chai.expect(dAction.l_u_ts).eql(action2ndTS);
          });

          it('using counter display id action', function () {
            const addedTS = Date.now();
            const actionTS = addedTS + (60 * 1000);
            const action2ndTS = addedTS + (120 * 1000);

            const offerObj2 = JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
            offerObj2.offer_id = 'y';

            mockCurrentTS(addedTS);
            chai.expect(db.addOfferObject('x', offerObj)).to.equal(true);
            chai.expect(db.addOfferObject('y', offerObj2)).to.equal(true);

            chai.expect(db.getOfferActionMeta('x', 'h1')).to.not.exist;
            chai.expect(db.getOfferDisplayActionMeta(offerObj.display_id, 'h1')).to.not.exist;

            mockCurrentTS(actionTS);
            chai.expect(db.incOfferAction('x', 'h1', true, 100)).to.equal(true);
            chai.expect(db.getOfferActionMeta('x', 'h1').count).to.equal(100);
            chai.expect(db.getOfferActionMeta('y', 'h1')).to.not.exist;

            let dAction = db.getOfferDisplayActionMeta(offerObj.display_id, 'h1');
            chai.expect(dAction.count).to.equal(100);
            chai.expect(dAction.c_ts).eql(actionTS);
            chai.expect(dAction.l_u_ts).eql(actionTS);

            // inc again
            mockCurrentTS(action2ndTS);
            chai.expect(db.incOfferAction('y', 'h1', true, 5)).to.equal(true);
            chai.expect(db.getOfferActionMeta('x', 'h1').count).to.equal(100);
            chai.expect(db.getOfferActionMeta('y', 'h1').count).to.equal(5);

            dAction = db.getOfferDisplayActionMeta(offerObj.display_id, 'h1');
            chai.expect(dAction.count).to.equal(105);
            chai.expect(dAction.c_ts).eql(actionTS);
            chai.expect(dAction.l_u_ts).eql(action2ndTS);
          });
        });

        context('attribute', function () {
          let db;
          let offerObj;

          beforeEach(function () {
            persistenceMocks['core/persistence/map'].reset();
            db = new OffersDB({});
            offerObj = JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
          });

          it('attribute added properly', function () {
            const addedTS = Date.now();
            const attTS = addedTS + (60 * 1000);

            mockCurrentTS(addedTS);
            chai.expect(db.addOfferObject('x', offerObj)).to.equal(true);
            chai.expect(db.incOfferAction('x', 'h1')).to.equal(true);
            chai.expect(db.getOfferAttribute('x', 'h1')).to.not.exist;
            const data = { something: 1 };
            mockCurrentTS(attTS);
            chai.expect(db.addOfferAttribute('x', 'h1', data)).to.equal(true);
            chai.expect(db.getOfferAttribute('x', 'h1').something).to.equal(data.something);
          });
        });

        context('getOffers', function () {
          let db;

          beforeEach(function () {
            persistenceMocks['core/persistence/map'].reset();
            db = new OffersDB({});
          });

          it('adding multiple offers', function () {
            const offers = [];
            for (let i = 0; i < 10; i += 1) {
              const o = JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
              o.offer_id = `offer-${i}`;
              offers.push(o);
              chai.expect(db.addOfferObject(o.offer_id, o)).to.equal(true);
            }
            const roffers = db.getOffers();
            chai.expect(roffers).to.exist;
            chai.expect(roffers.length).to.equal(offers.length);
            // chai.expect(roffers).to.eql(offers);
            // TODO: we should check here if we can find all the offers, they
            // may not be sorted as we add them so we need to do a better check here
            //
          });
        });

        context('persistence', function () {
          let o;

          beforeEach(function () {
            persistenceMocks['core/persistence/map'].reset();
            o = JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
          });

          it('stored offers remains', async function () {
            const odb = new OffersDB();
            await waitForDBLoaded(odb);
            chai.expect(odb.addOfferObject(o.offer_id, o)).to.equal(true);

            // check exists
            chai.expect(odb.hasOfferData(o.offer_id)).to.equal(true);
            chai.expect(odb.hasOfferObject(o.offer_id)).to.equal(true);
            chai.expect(odb.isOfferPresent(o.offer_id)).to.equal(true);

            // remove old
            // delete odb;
            const odb2 = new OffersDB();
            const p1 = waitForDBLoaded(odb2).then(() => {
              chai.expect(odb2.hasOfferData(o.offer_id)).to.equal(true);
              chai.expect(odb2.hasOfferObject(o.offer_id)).to.equal(true);
              chai.expect(odb2.isOfferPresent(o.offer_id)).to.equal(true);
              return Promise.resolve(true);
            });

            const odb3 = new OffersDB();
            const p2 = waitForDBLoaded(odb3).then(() => {
              chai.expect(odb3.hasOfferData(o.offer_id)).to.equal(true);
              chai.expect(odb3.hasOfferObject(o.offer_id)).to.equal(true);
              chai.expect(odb3.isOfferPresent(o.offer_id)).to.equal(true);
              return Promise.resolve(true);
            });

            // create a new one
            // delete odb;
            return Promise.all([p1, p2]);
          });

          it('stored offers and attributes remains', async function () {
            // const database = new Database('offers-test');
            const odb = new OffersDB();
            await waitForDBLoaded(odb);

            chai.expect(odb.addOfferObject(o.offer_id, o)).to.equal(true);
            chai.expect(odb.incOfferAction(o.offer_id, 'h1')).to.equal(true);
            chai.expect(odb.incOfferAction(o.offer_id, 'h2')).to.equal(true);
            chai.expect(odb.incOfferAction(o.offer_id, 'h3')).to.equal(true);

            const odb2 = new OffersDB();
            const p1 = waitForDBLoaded(odb2).then(() => {
              chai.expect(odb2.hasOfferData(o.offer_id)).to.equal(true);
              return Promise.resolve(true);
            });

            const odb3 = new OffersDB();
            const p2 = waitForDBLoaded(odb3).then(() => {
              chai.expect(odb3.hasOfferData(o.offer_id)).to.equal(true);
              chai.expect(odb3.getOfferActionMeta(o.offer_id, 'h1').count).to.equal(1);
              chai.expect(odb3.getOfferActionMeta(o.offer_id, 'h2').count).to.equal(1);
              chai.expect(odb3.getOfferActionMeta(o.offer_id, 'h3').count).to.equal(1);
              return Promise.resolve(true);
            });

            // create a new one
            // delete odb;
            return Promise.all([p1, p2]);
          });

          it('erased offers are removed completely', function () {
            const addedTS = Date.now();
            const laterTS = addedTS + (OffersConfigs.OFFERS_STORAGE_DEFAULT_TTS_SECS * 1000);
            const odb = new OffersDB();
            mockCurrentTS(addedTS);
            chai.expect(odb.addOfferObject(o.offer_id, o)).to.equal(true);
            chai.expect(odb.hasOfferObject(o.offer_id)).to.equal(true);
            chai.expect(odb.isOfferPresent(o.offer_id)).to.equal(true);
            chai.expect(odb.eraseOfferObject(o.offer_id)).to.equal(true);

            mockCurrentTS(laterTS);

            const odb3 = new OffersDB();
            return waitForDBLoaded(odb3).then(() => {
              chai.expect(odb.hasOfferObject(o.offer_id)).to.equal(false);
              chai.expect(odb.isOfferPresent(o.offer_id)).to.equal(false);
              return Promise.resolve(true);
            });
          });

          it('not old enough offers should remain', function () {
            const addedTS = Date.now();
            const laterTS = (addedTS + (OffersConfigs.OFFERS_STORAGE_DEFAULT_TTS_SECS * 1000))
              - 1000;
            const odb = new OffersDB();
            mockCurrentTS(addedTS);
            chai.expect(odb.addOfferObject(o.offer_id, o)).to.equal(true);
            chai.expect(odb.hasOfferObject(o.offer_id)).to.equal(true);

            mockCurrentTS(laterTS);

            const odb3 = new OffersDB();
            return waitForDBLoaded(odb3).then(() => {
              chai.expect(odb.hasOfferObject(o.offer_id)).to.equal(true);
              return Promise.resolve(true);
            });
          });
        });

        context('campaign ids', function () {
          let db;
          let baseDB;

          beforeEach(async function () {
            baseDB = {};
            persistenceMocks['core/persistence/map'].reset();
            db = new OffersDB(baseDB);
            await waitForDBLoaded(db);
          });

          it('invalid campaign has not offers', function () {
            chai.expect(db.getCampaignOffers('x')).to.not.exist;
          });

          it('single offer single campaign', function () {
            const o = getCopyValidOffer();
            chai.expect(db.addOfferObject(o.offer_id, o)).to.equal(true);
            chai.expect(db.getCampaignOffers(o.campaign_id)).to.exist;
            chai.expect(db.getCampaignOffers(o.campaign_id).has(o.offer_id)).to.true;
            chai.expect(db.getCampaignOffers(o.campaign_id).size).to.equal(1);
          });

          it('multiple offer single campaign', function () {
            const cid = 'offer-cid-1';
            for (let i = 0; i < 10; i += 1) {
              const o = getCopyValidOffer();
              o.offer_id = `offer-id-${i}`;
              o.campaign_id = cid;
              chai.expect(db.addOfferObject(o.offer_id, o)).to.equal(true);
              chai.expect(db.getCampaignOffers(o.campaign_id)).to.exist;
            }
            const offerSet = db.getCampaignOffers(cid);
            for (let i = 0; i < 10; i += 1) {
              const oid = `offer-id-${i}`;
              chai.expect(db.getCampaignOffers(cid).has(oid)).to.equal(true);
              chai.expect(offerSet.size).to.equal(10);
              chai.expect(db.getCampaignOffers(cid)).eql(offerSet);
            }
          });

          it('multiple offers multiple campaign', function () {
            for (let i = 0; i < 10; i += 1) {
              const cid = `cid-${i}`;
              for (let j = 0; j < 10; j += 1) {
                const o = getCopyValidOffer();
                o.offer_id = `offer-id-${i}-${j}`;
                o.campaign_id = cid;
                chai.expect(db.addOfferObject(o.offer_id, o)).to.equal(true);
              }
            }

            const expectedOffersSet = {};
            for (let i = 0; i < 10; i += 1) {
              const cid = `cid-${i}`;
              for (let j = 0; j < 10; j += 1) {
                const oid = `offer-id-${i}-${j}`;
                if (!expectedOffersSet[cid]) {
                  expectedOffersSet[cid] = new Set();
                }
                expectedOffersSet[cid].add(oid);
              }
            }

            for (let i = 0; i < 10; i += 1) {
              const cid = `cid-${i}`;
              for (let j = 0; j < 10; j += 1) {
                chai.expect(db.getCampaignOffers(cid)).to.exist;
                const offersSet = db.getCampaignOffers(cid);
                chai.expect(offersSet).to.exist;
                chai.expect(offersSet).eql(expectedOffersSet[cid]);
              }
            }
          });

          it('persistent keeps campaigns', function () {
            for (let i = 0; i < 10; i += 1) {
              const cid = `cid-${i}`;
              for (let j = 0; j < 10; j += 1) {
                const o = getCopyValidOffer();
                o.offer_id = `offer-id-${i}-${j}`;
                o.campaign_id = cid;
                chai.expect(db.addOfferObject(o.offer_id, o)).to.equal(true);
              }
            }
            const expectedOffersSet = {};
            for (let i = 0; i < 10; i += 1) {
              const cid = `cid-${i}`;
              for (let j = 0; j < 10; j += 1) {
                const oid = `offer-id-${i}-${j}`;
                if (!expectedOffersSet[cid]) {
                  expectedOffersSet[cid] = new Set();
                }
                expectedOffersSet[cid].add(oid);
              }
            }
            const db2 = new OffersDB();
            return waitForDBLoaded(db2).then(() => {
              for (let i = 0; i < 10; i += 1) {
                const cid = `cid-${i}`;
                for (let j = 0; j < 10; j += 1) {
                  chai.expect(db2.getCampaignOffers(cid)).to.exist;
                  const offersSet = db2.getCampaignOffers(cid);
                  chai.expect(offersSet).to.exist;
                  chai.expect(offersSet).eql(expectedOffersSet[cid]);
                }
              }
            });
          });
        });

        context('getLatestUpdatedOffer', function () {
          let db;

          beforeEach(function () {
            persistenceMocks['core/persistence/map'].reset();
            db = new OffersDB({});
          });

          it('single offer is returned', function () {
            const o = getCopyValidOffer();
            mockCurrentTS(123);
            chai.expect(db.addOfferObject(o.offer_id, o)).to.equal(true);
            const offersSet = new Set([o.offer_id]);
            const sorted = db.getLatestUpdatedOffer(offersSet);
            chai.expect(sorted).to.exist;
            chai.expect(sorted.length).to.eq(1);
            chai.expect(sorted[0].last_update).eql(123);
            chai.expect(sorted[0].offer_id).eql(o.offer_id);
            chai.expect(sorted[0].campaign_id).eql(o.campaign_id);
          });

          it('multiple offers are returned', function () {
            const cid = 'cid-1';
            const offersSet = new Set();
            const expRes = [];
            for (let i = 0; i < 10; i += 1) {
              const o = getCopyValidOffer();
              o.offer_id = `offer-id-${i}`;
              o.campaign_id = cid;
              mockCurrentTS(i);
              chai.expect(db.addOfferObject(o.offer_id, o)).to.equal(true);
              offersSet.add(o.offer_id);
              expRes.push({
                last_update: i,
                campaign_id: cid,
                offer_id: o.offer_id
              });
            }

            const sorted = db.getLatestUpdatedOffer(offersSet);
            chai.expect(sorted).to.exist;
            chai.expect(sorted.length).to.eq(10);
            // check the order now
            expRes.reverse();
            chai.expect(sorted).eql(expRes);
          });

          it('updated offers action updates order', function () {
            const cid = 'cid-1';
            const offersSet = new Set();
            const expRes = [];
            for (let i = 0; i < 10; i += 1) {
              const o = getCopyValidOffer();
              o.offer_id = `offer-id-${i}`;
              o.campaign_id = cid;
              mockCurrentTS(i);
              chai.expect(db.addOfferObject(o.offer_id, o)).to.equal(true);
              offersSet.add(o.offer_id);
              expRes.push({
                last_update: i,
                campaign_id: cid,
                offer_id: o.offer_id
              });
            }

            mockCurrentTS(524);
            chai.expect(db.incOfferAction('offer-id-0', 'action-x')).to.equal(true);
            expRes[0].last_update = mockedTS;
            mockCurrentTS(525);
            chai.expect(db.incOfferAction('offer-id-5', 'action-x')).to.equal(true);
            expRes[5].last_update = mockedTS;
            mockCurrentTS(526);
            chai.expect(db.incOfferAction('offer-id-8', 'action-x')).to.equal(true);
            expRes[8].last_update = mockedTS;

            // now we should expect 8 5 0 ... same than before
            const sorted = db.getLatestUpdatedOffer(offersSet);
            chai.expect(sorted).to.exist;
            chai.expect(sorted.length).to.eq(10);
            // check the order now
            expRes.sort((a, b) => b.last_update - a.last_update);
            chai.expect(expRes[0].offer_id).eql('offer-id-8');
            chai.expect(expRes[1].offer_id).eql('offer-id-5');
            chai.expect(expRes[2].offer_id).eql('offer-id-0');
            chai.expect(sorted).eql(expRes);
          });

          it('removed offers not returned', function () {
            const cid = 'cid-1';
            const offersSet = new Set();
            const expRes = [];
            for (let i = 0; i < 10; i += 1) {
              const o = getCopyValidOffer();
              o.offer_id = `offer-id-${i}`;
              o.campaign_id = cid;
              mockCurrentTS(100 - i);
              chai.expect(db.addOfferObject(o.offer_id, o)).to.equal(true);
              offersSet.add(o.offer_id);
              expRes.push({
                last_update: 100 - i,
                campaign_id: cid,
                offer_id: o.offer_id
              });
            }

            mockCurrentTS(524);
            chai.expect(db.removeOfferObject('offer-id-0', 'action-x')).to.equal(true);
            expRes[0].last_update = mockedTS;
            mockCurrentTS(525);
            chai.expect(db.removeOfferObject('offer-id-5', 'action-x')).to.equal(true);
            expRes[5].last_update = mockedTS;
            mockCurrentTS(526);
            chai.expect(db.removeOfferObject('offer-id-8', 'action-x')).to.equal(true);
            expRes[8].last_update = mockedTS;

            // now we should expect 8 5 0 ... same than before
            const sorted = db.getLatestUpdatedOffer(offersSet);
            chai.expect(sorted).to.exist;
            chai.expect(sorted.length).to.eq(7);
            // check the order now
            expRes.sort((a, b) => b.last_update - a.last_update);
            // remove 3 elements
            expRes.shift();
            expRes.shift();
            expRes.shift();
            chai.expect(sorted).eql(expRes);
          });

          it('registered callbacks works for offer added', function () {
            const o = getCopyValidOffer();
            let resultEvent = {};
            const cb = (evt) => { resultEvent = evt; };
            db.registerCallback(cb);
            chai.expect(db.addOfferObject(o.offer_id, o)).to.equal(true);
            chai.expect(resultEvent).to.eql({ evt: 'offer-added', offer: o, lastUpdateTS: mockedTS });
          });

          it('registered callbacks works for offer updated', function () {
            const o = getCopyValidOffer();
            let resultEvent = {};
            const cb = (evt) => { resultEvent = evt; };
            db.registerCallback(cb);
            chai.expect(db.addOfferObject(o.offer_id, o)).to.equal(true);
            chai.expect(resultEvent).to.eql({ evt: 'offer-added', offer: o, lastUpdateTS: mockedTS });
            o.someRandomStuff = 'xyz';
            chai.expect(db.updateOfferObject(o.offer_id, o)).to.equal(true);
            chai.expect(resultEvent).to.eql({ evt: 'offer-updated', offer: o, lastUpdateTS: mockedTS });
          });

          it('registered callbacks works for offer removed', function () {
            const o = getCopyValidOffer();
            let resultEvent = {};
            const cb = (evt) => { resultEvent = evt; };
            db.registerCallback(cb);
            chai.expect(db.addOfferObject(o.offer_id, o)).to.equal(true);
            chai.expect(resultEvent).to.eql({ evt: 'offer-added', offer: o, lastUpdateTS: mockedTS });
            chai.expect(db.removeOfferObject(o.offer_id)).to.equal(true);
            chai.expect(resultEvent).to.eql({ evt: 'offer-removed', offer: o, lastUpdateTS: mockedTS });
          });

          it('registered callbacks works for offer erased (which is offer-removed)', function () {
            const o = getCopyValidOffer();
            let resultEvent = {};
            const cb = (evt) => { resultEvent = evt; };
            db.registerCallback(cb);
            chai.expect(db.addOfferObject(o.offer_id, o)).to.equal(true);
            chai.expect(resultEvent).to.eql({ evt: 'offer-added', offer: o, lastUpdateTS: mockedTS });
            chai.expect(db.eraseOfferObject(o.offer_id)).to.equal(true);
            chai.expect(resultEvent).to.eql({ evt: 'offer-removed', offer: o, lastUpdateTS: mockedTS, extraData: { erased: true } });
          });

          it('unregistered callbacks works', function () {
            const o = getCopyValidOffer();
            let resultEvent = {};
            const cb = (evt) => { resultEvent = evt; };
            db.registerCallback(cb);
            chai.expect(db.addOfferObject(o.offer_id, o)).to.equal(true);
            chai.expect(resultEvent).eql({ evt: 'offer-added', offer: o, lastUpdateTS: mockedTS });
            db.unregisterCallback(cb);
            resultEvent = null;
            chai.expect(db.removeOfferObject(o.offer_id)).to.equal(true);
            chai.expect(resultEvent).to.equal(null);
          });
        });

        context('/offer erase', function () {
          let db;

          beforeEach(function () {
            persistenceMocks['core/persistence/map'].reset();
            db = new OffersDB({});
          });

          it('erasing invalid offer doesnt blow works', function () {
            chai.expect(db.eraseOfferObject('xyz')).eql(false);
          });

          it('erasing an offer works', function () {
            const offersData = [
              { client_id: 'client2', id: 'o4' }
            ];
            const o = genOffers(offersData)[0];
            chai.expect(db.addOfferObject(o.offer_id, o)).to.equal(true);

            chai.expect(db.hasOfferData(o.offer_id)).eql(true);
            chai.expect(db.isOfferPresent(o.offer_id)).eql(true);
            chai.expect(db.eraseOfferObject(o.offer_id)).eql(true);


            chai.expect(db.hasOfferData(o.offer_id)).eql(false);
            chai.expect(db.isOfferPresent(o.offer_id)).eql(false);
            chai.expect(db.getOfferMeta(o.offer_id)).eql(null);
          });

          context('/update db offer', () => {
            const origBucket = { start: 0, end: 4999 };
            const newBucket = { start: 5000, end: 9999 };
            let origOffer;
            let newOffer;
            let offer1id;

            beforeEach(() => {
              [origOffer, newOffer] = genOffers([
                { id: 'oid', abTestInfo: origBucket },
                { id: 'oid', abTestInfo: newBucket },
              ]);
              offer1id = origOffer.offer_id;
              db.addOfferObject(offer1id, origOffer);
            });

            it('Updates abTestInfo', () => {
              db.updateOfferObject(offer1id, newOffer);

              const updatedSpec = db.getOfferObject(offer1id).abTestInfo;
              chai.expect(updatedSpec).eql(newBucket);
            });

            it('Retain existing abTestInfo', () => {
              db.updateOfferObject(offer1id, newOffer, /* retainAbTestInfo */ true);

              const updatedSpec = db.getOfferObject(offer1id).abTestInfo;
              chai.expect(updatedSpec).eql(origBucket);
            });
          });
        });

        context('/has another offer of same campaign', () => {
          let db;
          let offer;
          let anotherOffer;

          beforeEach(() => {
            persistenceMocks['core/persistence/map'].reset();
            db = new OffersDB({});
            offer = new Offer(JSON.parse(JSON.stringify(VALID_OFFER_OBJ)));
            const o = JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
            o.offer_id = 'another';
            anotherOffer = new Offer(o);
          });

          it('/no offers at all', () => {
            const unseenOffer = anotherOffer;

            const hasAnother = db.hasAnotherOfferOfSameCampaign(unseenOffer);

            chai.expect(hasAnother).to.be.false;
          });

          it('/only one offer and it is the same', () => {
            db.addOfferObject(offer.uniqueID, offer.offerObj);

            const hasAnother = db.hasAnotherOfferOfSameCampaign(offer);

            chai.expect(hasAnother).to.be.false;
          });

          it('/several offers', () => {
            db.addOfferObject(offer.uniqueID, offer.offerObj);
            db.addOfferObject(anotherOffer.uniqueID, anotherOffer.offerObj);

            const hasAnother = db.hasAnotherOfferOfSameCampaign(offer);

            chai.expect(hasAnother).to.be.true;
          });
        });

        context('/display count', () => {
          let db;
          let offerID;

          beforeEach(() => {
            persistenceMocks['core/persistence/map'].reset();
            db = new OffersDB({});
            const offer = new Offer(JSON.parse(JSON.stringify(VALID_OFFER_OBJ)));
            offerID = offer.uniqueID;
            db.addOfferObject(offerID, offer.offerObj);
          });

          it('/zero for unknown offer', () => {
            const count = db.getPushCount('no-such-offer');

            chai.expect(count).to.eql(0);
          });

          it('/zero for a just added offer', () => {
            const count = db.getPushCount(offerID);

            chai.expect(count).to.eql(0);
          });

          it('/counts', () => {
            db.incOfferAction(offerID, 'offer_pushed');
            db.incOfferAction(offerID, 'offer_pushed');
            db.incOfferAction(offerID, 'offer_pushed');

            const count = db.getPushCount(offerID);

            chai.expect(count).to.eql(3);
          });

          it('/reason: make js object from stored json', () => {
            db.addReasonForHaving(offerID, { toStorage: () => ({ reason: ['smth'] }) });

            const reasonObj = db.getReasonForHaving(offerID);
            const expected = [{ pattern: 'smth' }];
            chai.expect(reasonObj.getReason()).is.eql(expected);
          });
        });

        describe('/download offer images', () => {
          let db;
          let offerObj;
          let templateData;

          beforeEach(async function () {
            db = await getEmptyOfferDB(this.system, db);
            db.addOfferObject(VALID_OFFER_OBJ.offer_id, VALID_OFFER_OBJ);
            offerObj = db.getOfferObject(VALID_OFFER_OBJ.offer_id);
            templateData = offerObj.ui_info.template_data;
            templateData.logo_url = 'fake://?body=some data&header.content-type=image/smth';
            templateData.picture_url = 'fake://?body=another data&header.content-type=image/smth';
            templateData.logo_dataurl = undefined;
            templateData.picture_dataurl = undefined;
          });

          it('/download missed images', async () => {
            const expectedLogoDataurl = 'data:image/smth;base64,c29tZSBkYXRh';
            const expectedPictureDataurl = 'data:image/smth;base64,YW5vdGhlciBkYXRh';

            const dbOffers = db.getOffers();
            await waitFor(() => !db.imageDownloader.nThreads);

            const dbOffer = new Offer(dbOffers[0].offer);
            await waitFor(() => {
              chai.expect(dbOffer.getLogoDataurl()).to.eq(expectedLogoDataurl);
              chai.expect(dbOffer.getPictureDataurl()).to.eq(expectedPictureDataurl);
            });
          });

          context('/do not download', () => {
            let fetch;
            let downloader;
            let db2;

            beforeEach(() => {
              fetch = sinon.stub().callsFake(url => db.imageDownloader.fetch(url));
              downloader = new db.imageDownloader.constructor({ fetch });
              db2 = new OffersDB({ imageDownloader: downloader });
              db2.addOfferObject(offerObj.offer_id, offerObj);
              templateData = db2.getOfferObject(offerObj.offer_id).ui_info.template_data;
            });

            it('/do not download already downloaded images', async () => {
              templateData.logo_dataurl = 'data:image/smth;base64,etc';
              templateData.picture_dataurl = 'data:image/smth;base64,etc';

              db2.getOffers();
              await waitFor(() => !downloader.nThreads);

              chai.expect(fetch).to.have.not.been.called;
            });

            it('/do not download images often', async () => {
              db2.getOffers();
              await waitFor(() => !downloader.nThreads);

              templateData.logo_dataurl = undefined;
              templateData.picture_dataurl = undefined;
              fetch.reset();

              db2.getOffers();
              await waitFor(() => !downloader.nThreads);

              chai.expect(fetch).to.have.not.been.called;
            });
          });
        });
      });
    });
  });
