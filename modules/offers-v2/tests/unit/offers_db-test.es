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

export default describeModule('offers-v2/offers_db',
  () => ({
    './logging_handler': {
      default: {}
    },
    'core/platform': {
      isChromium: false,
    },
    'core/console': {
      default: {}
    },
    'core/prefs': {
      default: {}
    },
    'core/cliqz': {
      utils: {
        setInterval: function() {},
      }
    },
    './db_helper': {
      default: class {
        constructor(db) {
          this.db = db;
        }
        saveDocData(docID, docData) {
          const self = this;
          return new Promise((resolve, reject) => {
            self.db[docID] = docData;
            resolve();
          });
        }
        getDocData(docID) {
          const self = this;
          return new Promise((resolve, reject) => {
            resolve(self.db[docID]);
          });
        }
        removeDocData(docID) {}
      }
    }
  }),
  () => {
    describe('OffersDB', function() {
      let OffersDB;

      beforeEach(function () {
        OffersDB = this.module().default;
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

          it('cannot remove inexistent', function () {
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
            chai.expect(db.addOfferObject('x', offerObj)).to.equal(true);
            chai.expect(db.getOfferActionMeta('x', 'h1')).to.not.exist;
            chai.expect(db.incOfferAction('x', 'h1')).to.equal(true);
            let action = db.getOfferActionMeta('x', 'h1');
            chai.expect(action).to.exist;
            chai.expect(action.count).to.equal(1);

            // inc again
            chai.expect(db.incOfferAction('x', 'h1')).to.equal(true);
            action = db.getOfferActionMeta('x', 'h1');
            chai.expect(action.count).to.equal(2);
          });

          it('display id action', function () {
            const offerObj2 = JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
            offerObj2.offer_id = 'y';
            chai.expect(db.addOfferObject('x', offerObj)).to.equal(true);
            chai.expect(db.addOfferObject('y', offerObj2)).to.equal(true);

            chai.expect(db.getOfferActionMeta('x', 'h1')).to.not.exist;
            chai.expect(db.getOfferDisplayActionMeta(offerObj.display_id, 'h1')).to.not.exist;

            chai.expect(db.incOfferAction('x', 'h1')).to.equal(true);
            chai.expect(db.getOfferActionMeta('x', 'h1').count).to.equal(1);
            chai.expect(db.getOfferActionMeta('y', 'h1')).to.not.exist;
            chai.expect(db.getOfferDisplayActionMeta(offerObj.display_id, 'h1').count).to.equal(1);

            // inc again
            chai.expect(db.incOfferAction('y', 'h1')).to.equal(true);
            chai.expect(db.getOfferActionMeta('x', 'h1').count).to.equal(1);
            chai.expect(db.getOfferActionMeta('y', 'h1').count).to.equal(1);
            chai.expect(db.getOfferDisplayActionMeta(offerObj.display_id, 'h1').count).to.equal(2);
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
            chai.expect(db.addOfferObject('x', offerObj)).to.equal(true);
            chai.expect(db.incOfferAction('x', 'h1')).to.equal(true);
            chai.expect(db.getOfferAttribute('x', 'h1')).to.not.exist;
            const data = {something: 1};
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
        });


        // TODO: we need to add more tests
        // - check time is properly update whenever we update an action / attribute
        // - check proper attributes update
        // - check persistence on hard disk, and if they are stored properly
        // - check that old offers are removed properly from DB
      });
    })
  }
);
