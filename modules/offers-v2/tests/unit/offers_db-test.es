/* global chai */
/* global describeModule */
/* global require */

const VALID_OFFER_OBJ = {
  "action_info": {
      "on_click": "https://www.cliqz.com"
  },
  "campaign_id": "cid_1",
  "display_id": "x-d",
  "filter_info": {
      "not_closed_mt": 3
  },
  "offer_id": "x",
  "rule_info": {
      "display_time_secs": 999999,
      "type": "exact_match",
      "url": []
  },
  "ui_info": {
      "template_data": {
          "call_to_action": {
              "target": "",
              "text": "Jetzt Anfordern",
              "url": "http://newurl"
          },
          "conditions": "Some conditions",
          "desc": "Some description",
          "logo_url": "somelogourl",
          "title": "This is the title",
          "voucher_classes": ""
      },
      "template_name": "ticket_template"
  }
};

let mockedTS = Date.now();

function mockCurrentTS(ts) {
  mockedTS = ts;
}

export default describeModule('offers-v2/offers_db',
  () => ({
    'offers-v2/utils': {
      timestampMS: () => mockedTS
    },
    'offers-v2/common/offers_v2_logger': {
      default: {
        debug: () => {},
        error: () => {},
        info: () => {},
        log: () => {},
        warn: () => {},
        logObject: () => {},
      }
    },
    'core/platform': {
      isChromium: false,
    },
    // 'core/console': {
    //   default: {}
    // },
    'core/prefs': {
      default: {}
    },
    'core/cliqz': {
      utils: {
        setInterval: function() {},
      }
    },
    'core/helpers/timeout': {
      default: function() { const stop = () => {}; return { stop }; }
    },
    'offers-v2/db_helper': {
      default: class {
        constructor(db) {
          this.db = db;
        }
        saveDocData(docID, docData) {
          const self = this;
          return new Promise((resolve, reject) => {
            self.db[docID] = JSON.parse(JSON.stringify(docData));
            resolve();
          });
        }
        getDocData(docID) {
          const self = this;
          return new Promise((resolve, reject) => {
            resolve(JSON.parse(JSON.stringify(self.db[docID])));
          });
        }
        removeDocData(docID) {}
      }
    }
  }),
  () => {
    describe('OffersDB', function() {
      let OffersDB;
      let OffersConfigs;

      function getCopyValidOffer() {
        return JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
      }

      beforeEach(function () {
        OffersDB = this.module().default;
        return Promise.all([
          this.system.import('offers-v2/offers_configs').then(result => {
            OffersConfigs = result.default;
          })
        ]);
      });

      describe('#offerObject', function () {
        context('invalid offer object', function () {
          let db;
          let offerObj;

          beforeEach(function () {
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
            const data = {something: 1};
            mockCurrentTS(attTS);
            chai.expect(db.addOfferAttribute('x', 'h1', data)).to.equal(true);
            chai.expect(db.getOfferAttribute('x', 'h1').something).to.equal(data.something);
          });

        });

        context('getOffers', function () {
          let db;

          beforeEach(function () {
            db = new OffersDB({});
          });

          it('adding multiple offers', function () {
            const offers = [];
            for (let i = 0; i < 10; ++i) {
              const o = JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
              o.offer_id = `offer-${i}`;
              offers.push(o);
              chai.expect(db.addOfferObject(o.offer_id, o)).to.equal(true);
            }
            const roffers = db.getOffers();
            chai.expect(roffers).to.exist;
            chai.expect(roffers.length).to.equal(offers.length);
            //chai.expect(roffers).to.eql(offers);
            // TODO: we should check here if we can find all the offers, they
            // may not be sorted as we add them so we need to do a better check here
            //
          });

        });

        context('persistence', function () {
          let o;

          beforeEach(function () {
            o = JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
          });

          it('stored offers remains', function () {
            // const database = new Database('offers-test');
            let database = {};
            let odb = new OffersDB(database);
            chai.expect(odb.addOfferObject(o.offer_id, o)).to.equal(true);
            odb.savePersistentData();

            // check exists
            chai.expect(odb.hasOfferData(o.offer_id)).to.equal(true);
            chai.expect(odb.hasOfferObject(o.offer_id)).to.equal(true);
            chai.expect(odb.isOfferPresent(o.offer_id)).to.equal(true);

            // remove old
            // delete odb;
            let odb2 = new OffersDB({});
            const p1 = odb2.loadPersistentData().then(() => {
              chai.expect(odb2.hasOfferData(o.offer_id)).to.equal(false);
              chai.expect(odb2.hasOfferObject(o.offer_id)).to.equal(false);
              chai.expect(odb2.isOfferPresent(o.offer_id)).to.equal(false);
            });

            let odb3 = new OffersDB(database);
            const p2 = odb3.loadPersistentData().then(() => {
              chai.expect(odb3.hasOfferData(o.offer_id)).to.equal(true);
              chai.expect(odb3.hasOfferObject(o.offer_id)).to.equal(true);
              chai.expect(odb3.isOfferPresent(o.offer_id)).to.equal(true);
            });

            // create a new one
            // delete odb;
            return Promise.all([p1, p2]);
          });

          it('stored offers and attributes remains', function () {
            // const database = new Database('offers-test');
            let database = {};
            let odb = new OffersDB(database);
            chai.expect(odb.addOfferObject(o.offer_id, o)).to.equal(true);
            chai.expect(odb.incOfferAction(o.offer_id, 'h1')).to.equal(true);
            chai.expect(odb.incOfferAction(o.offer_id, 'h2')).to.equal(true);
            chai.expect(odb.incOfferAction(o.offer_id, 'h3')).to.equal(true);
            odb.savePersistentData();

            let odb2 = new OffersDB({});
            const p1 = odb2.loadPersistentData().then(() => {
              chai.expect(odb2.hasOfferData(o.offer_id)).to.equal(false);
            });

            let odb3 = new OffersDB(database);
            const p2 = odb3.loadPersistentData().then(() => {
              chai.expect(odb3.hasOfferData(o.offer_id)).to.equal(true);
              chai.expect(odb3.getOfferActionMeta(o.offer_id, 'h1').count).to.equal(1);
              chai.expect(odb3.getOfferActionMeta(o.offer_id, 'h2').count).to.equal(1);
              chai.expect(odb3.getOfferActionMeta(o.offer_id, 'h3').count).to.equal(1);
            });

            // create a new one
            // delete odb;
            return Promise.all([p1, p2]);
          });

          it('old offers removed', function () {
            const addedTS = Date.now();
            const laterTS = addedTS + (OffersConfigs.OFFERS_STORAGE_DEFAULT_TTS_SECS * 1000);
            let database = {};
            let odb = new OffersDB(database);
            mockCurrentTS(addedTS);
            chai.expect(odb.addOfferObject(o.offer_id, o)).to.equal(true);
            chai.expect(odb.hasOfferObject(o.offer_id)).to.equal(true);
            return odb.savePersistentData().then(() => {
              return odb.loadPersistentData().then(() => {
                chai.expect(odb.hasOfferObject(o.offer_id)).to.equal(true);
                mockCurrentTS(laterTS);
                return odb.loadPersistentData().then((result)=> {
                  chai.expect(odb.hasOfferObject(o.offer_id)).to.equal(false);
                });
              });
            });
          });

          it('not old enough offers should remain', function () {
            const addedTS = Date.now();
            const laterTS = addedTS + (1 * 1000);
            let database = {};
            let odb = new OffersDB(database);
            mockCurrentTS(addedTS);
            chai.expect(odb.addOfferObject(o.offer_id, o)).to.equal(true);
            chai.expect(odb.hasOfferObject(o.offer_id)).to.equal(true);
            return odb.savePersistentData().then(() => {
              return odb.loadPersistentData().then(() => {
                chai.expect(odb.hasOfferObject(o.offer_id)).to.equal(true);
                mockCurrentTS(laterTS);
                return odb.loadPersistentData().then((result)=> {
                  chai.expect(odb.hasOfferObject(o.offer_id)).to.equal(true);
                });
              });
            });
          });
        });

        context('campaign ids', function () {
          let db;
          let baseDB;

          beforeEach(function () {
            baseDB = {};
            db = new OffersDB(baseDB);
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
            for (let i = 0; i < 10; ++i) {
              const o = getCopyValidOffer();
              o.offer_id = `offer-id-${i}`;
              o.campaign_id = cid;
              chai.expect(db.addOfferObject(o.offer_id, o)).to.equal(true);
              chai.expect(db.getCampaignOffers(o.campaign_id)).to.exist;
            }
            const offerSet = db.getCampaignOffers(cid);
            for (let i = 0; i < 10; ++i) {
              const oid = `offer-id-${i}`;
              chai.expect(db.getCampaignOffers(cid).has(oid)).to.equal(true);
              chai.expect(offerSet.size).to.equal(10);
              chai.expect(db.getCampaignOffers(cid)).eql(offerSet);
            }

          });

          it('multiple offers multiple campaign', function () {
            for (let i = 0; i < 10; ++i) {
              const cid = `cid-${i}`;
              for (let j = 0; j < 10; ++j) {
                const o = getCopyValidOffer();
                o.offer_id = `offer-id-${i}-${j}`;
                o.campaign_id = cid;
                chai.expect(db.addOfferObject(o.offer_id, o)).to.equal(true);
              }
            }

            const expectedOffersSet = {};
            for (let i = 0; i < 10; ++i) {
              const cid = `cid-${i}`;
              for (let j = 0; j < 10; ++j) {
                const oid = `offer-id-${i}-${j}`;
                if (!expectedOffersSet[cid]) {
                  expectedOffersSet[cid] = new Set();
                }
                expectedOffersSet[cid].add(oid);
              }
            }

            for (let i = 0; i < 10; ++i) {
              const cid = `cid-${i}`;
              for (let j = 0; j < 10; ++j) {
                const oid = `offer-id-${i}-${j}`;
                chai.expect(db.getCampaignOffers(cid)).to.exist;
                const offersSet = db.getCampaignOffers(cid);
                chai.expect(offersSet).to.exist;
                chai.expect(offersSet).eql(expectedOffersSet[cid]);
              }
            }

          });

          it('persistent keeps campaigns', function () {
            for (let i = 0; i < 10; ++i) {
              const cid = `cid-${i}`;
              for (let j = 0; j < 10; ++j) {
                const o = getCopyValidOffer();
                o.offer_id = `offer-id-${i}-${j}`;
                o.campaign_id = cid;
                chai.expect(db.addOfferObject(o.offer_id, o)).to.equal(true);
              }
            }
            const expectedOffersSet = {};
            for (let i = 0; i < 10; ++i) {
              const cid = `cid-${i}`;
              for (let j = 0; j < 10; ++j) {
                const oid = `offer-id-${i}-${j}`;
                if (!expectedOffersSet[cid]) {
                  expectedOffersSet[cid] = new Set();
                }
                expectedOffersSet[cid].add(oid);
              }
            }
            return db.savePersistentData().then(() => {
              const db2 = new OffersDB(baseDB);
              return db2.loadPersistentData().then(() => {
                for (let i = 0; i < 10; ++i) {
                  const cid = `cid-${i}`;
                  for (let j = 0; j < 10; ++j) {
                    const oid = `offer-id-${i}-${j}`;
                    chai.expect(db2.getCampaignOffers(cid)).to.exist;
                    const offersSet = db2.getCampaignOffers(cid);
                    chai.expect(offersSet).to.exist;
                    chai.expect(offersSet).eql(expectedOffersSet[cid]);
                  }
                }
              });
            });
          });

        });

        context('getLatestUpdatedOffer', function () {
          let db;

          beforeEach(function () {
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
            const cid = `cid-1`;
            const offersSet = new Set();
            const expRes = [];
            for (let i = 0; i < 10; ++i) {
              const o = getCopyValidOffer();
              o.offer_id = `offer-id-${i}`;
              o.campaign_id = cid;
              mockCurrentTS(i);
              chai.expect(db.addOfferObject(o.offer_id, o)).to.equal(true);
              offersSet.add(o.offer_id)
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
            const cid = `cid-1`;
            const offersSet = new Set();
            const expRes = [];
            for (let i = 0; i < 10; ++i) {
              const o = getCopyValidOffer();
              o.offer_id = `offer-id-${i}`;
              o.campaign_id = cid;
              mockCurrentTS(i);
              chai.expect(db.addOfferObject(o.offer_id, o)).to.equal(true);
              offersSet.add(o.offer_id)
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
            expRes.sort((a,b) => b.last_update - a.last_update);
            chai.expect(expRes[0].offer_id).eql('offer-id-8');
            chai.expect(expRes[1].offer_id).eql('offer-id-5');
            chai.expect(expRes[2].offer_id).eql('offer-id-0');
            chai.expect(sorted).eql(expRes);
          });

          it('removed offers not returned', function () {
            const cid = `cid-1`;
            const offersSet = new Set();
            const expRes = [];
            for (let i = 0; i < 10; ++i) {
              const o = getCopyValidOffer();
              o.offer_id = `offer-id-${i}`;
              o.campaign_id = cid;
              mockCurrentTS(100-i);
              chai.expect(db.addOfferObject(o.offer_id, o)).to.equal(true);
              offersSet.add(o.offer_id)
              expRes.push({
                last_update: 100-i,
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
            expRes.sort((a,b) => b.last_update - a.last_update);
            // remove 3 elements
            expRes.shift();
            expRes.shift();
            expRes.shift();
            chai.expect(sorted).eql(expRes);
          });

        });



        // TODO: we need to add more tests
        // - check persistence on hard disk, and if they are stored properly
      });
    });
  }
);
