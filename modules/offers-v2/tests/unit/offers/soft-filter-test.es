/* global chai */
/* global describeModule */
/* global require */
/* eslint no-param-reassign: off */

const jspe = require('jsep');
const commonMocks = require('../utils/common');
const persistenceMocks = require('../utils/persistence');
const VALID_OFFER_OBJ = require('../utils/offers/data').VALID_OFFER_OBJ;

const ABTestNumber = 0;

export default describeModule('offers-v2/offers/soft-filter',
  () => ({
    ...commonMocks,
    ...persistenceMocks,
    'platform/lib/jsep': {
      default: jspe,
    },
    'offers-v2/utils': {
      getABNumber: function () {
        return ABTestNumber;
      },
      timestampMS: function () {
        return Date.now();
      }
    },
    'offers-v2/background': {
      default: {
        offersAPI: {
          processRealEstateMessage: () => {}
        }
      },
    },
  }),
  () => {
    describe('#soft-filter', function () {
      let OfferDB;
      let ActionID;
      let Offer;
      let shouldFilterOffer;


      beforeEach(function () {
        shouldFilterOffer = this.module().default;
        const p1 = this.system.import('offers-v2/offers/offers-db');
        const p2 = this.system.import('offers-v2/offers/actions-defs');
        const p3 = this.system.import('offers-v2/offers/offer');
        return Promise.all([p1, p2, p3]).then((mods) => {
          OfferDB = mods[0].default;
          ActionID = mods[1].default;
          Offer = mods[2].default;
        });
      });

      function getOfferObj() {
        return JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
      }

      function buildOffer(filterRules) {
        const o = getOfferObj();
        o.filterRules.eval_expression = filterRules;
        const offerObj = new Offer(o);
        chai.expect(offerObj.isValid()).eql(true);
        return offerObj;
      }

      context('basic tests', function () {
        let db;
        let offerObj;
        let offer;

        beforeEach(function () {
          db = new OfferDB({});
          offerObj = JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
        });

        function updateOfferOnDB(ob, rules) {
          ob.filterRules.eval_expression = rules;
          if (db.hasOfferData(ob.offer_id)) {
            db.updateOfferObject(ob.offer_id, ob);
          } else {
            db.addOfferObject(ob.offer_id, ob);
          }
          return new Offer(ob);
        }

        it('/test shouldFilterOffer exists', function () {
          chai.expect(shouldFilterOffer).to.exist;
        });

        // NOTE: take into account we should return promises whenever it is
        // the case since if not the test will always pass
        // tests to implement:
        // - invalid arguments return expected results
        // - checking rules for an offer doesnt exists
        // - adding an offer without filter rules works
        // - check each of the filter eval functions in positive / negative cases
        // - check invalid eval functions
        // - check that adding random actions doesnt affect the rule itself
        // - check multiple rules at the same time still work
        // - check for rules names that doesnt exists? should be valid or not the offer?

        it('/shouldFilterOffer: test invalid args', function () {
          chai.expect(shouldFilterOffer(null, {})).to.be.equal(true);
          chai.expect(shouldFilterOffer(undefined, {})).to.be.equal(true);
          chai.expect(shouldFilterOffer('', {})).to.be.equal(true);
        });

        it('/shouldFilterOffer empty rules makes the offer pass', function () {
          delete offerObj.filterRules;
          offer = new Offer(offerObj);
          chai.expect(db.addOfferObject(offer.uniqueID, offerObj)).to.be.equal(true);
          chai.expect(db.hasOfferData(offer.uniqueID)).to.be.equal(true);
          chai.expect(db.isOfferPresent(offer.uniqueID)).to.be.equal(true);

          // if the offer doesn't exist on the DB then we should show it
          chai.expect(shouldFilterOffer(offer, db), 'non existing check').to.be.equal(false);

          // check empty ness
          offerObj = getOfferObj();
          offerObj.offer_id = 'x2';
          offerObj.filterRules = '';
          offer = new Offer(offerObj);

          chai.expect(db.addOfferObject(offer.uniqueID, offerObj)).to.be.equal(true);
          chai.expect(db.hasOfferData(offer.uniqueID)).to.be.equal(true);
          chai.expect(db.isOfferPresent(offer.uniqueID)).to.be.equal(true);

          // if the offer doesn't exist on the DB then we should show it
          chai.expect(shouldFilterOffer(offer, db), 'empty check').to.be.equal(false);
        });

        //

        it('/shouldFilterOffer checking rule offer_closed < X', function () {
          let rules = "generic_comparator('offer_closed','counter','<=',0)";
          offer = buildOffer(rules);

          chai.expect(db.addOfferObject(offer.uniqueID, offerObj)).to.be.equal(true);
          chai.expect(db.hasOfferData(offer.uniqueID)).to.be.equal(true);

          // not expect to pass
          chai.expect(shouldFilterOffer(offer, db), 'e1').to.be.equal(false);
          rules = "generic_comparator('offer_closed','counter','<=',3)";
          offer = updateOfferOnDB(offer.offerObj, rules);
          chai.expect(shouldFilterOffer(offer, db), 'e2').to.be.equal(false);
          // add the actions on the DB
          chai.expect(db.incOfferAction(offer.uniqueID, ActionID.AID_OFFER_CLOSED))
            .to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offer.uniqueID, ActionID.AID_OFFER_CLOSED).count, 'e3')
            .to.be.equal(1);
          // now should fail since we expect to not be closed more than 0 times
          rules = "generic_comparator('offer_closed','counter','<=',0)";
          offer = updateOfferOnDB(offer.offerObj, rules);
          chai.expect(shouldFilterOffer(offer, db)).to.be.equal(true);
          // now should pass
          rules = "generic_comparator('offer_closed','counter','<=',1)";
          offer = updateOfferOnDB(offer.offerObj, rules);
          chai.expect(shouldFilterOffer(offer, db), 'e4').to.be.equal(false);
          rules = "generic_comparator('offer_closed','counter','<=',2)";
          offer = updateOfferOnDB(offer.offerObj, rules);
          chai.expect(shouldFilterOffer(offer, db), 'e5').to.be.equal(false);
          // increase 2 more times
          chai.expect(db.incOfferAction(offer.uniqueID, ActionID.AID_OFFER_CLOSED))
            .to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offer.uniqueID, ActionID.AID_OFFER_CLOSED).count)
            .to.be.equal(2);
          chai.expect(shouldFilterOffer(offer, db), 'e6').to.be.equal(false);
          chai.expect(db.incOfferAction(offer.uniqueID, ActionID.AID_OFFER_CLOSED))
            .to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offer.uniqueID, ActionID.AID_OFFER_CLOSED).count)
            .to.be.equal(3);
          // it should fail again
          chai.expect(shouldFilterOffer(offer, db)).to.be.equal(true);
        });

        it('/shouldFilterOffer checking rule offer_shown > X sec ago', function () {
          let rules = "generic_comparator('offer_shown','l_u_ts','>=',0)";
          offer = buildOffer(rules);
          chai.expect(db.addOfferObject(offer.uniqueID, offerObj)).to.be.equal(true);
          chai.expect(db.hasOfferData(offer.uniqueID)).to.be.equal(true);
          chai.expect(db.incOfferAction(offer.uniqueID, ActionID.AID_OFFER_SHOWN))
            .to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offer.uniqueID, ActionID.AID_OFFER_SHOWN).count)
            .to.be.equal(1);

          // updated more than 0 seconds ago: pass
          chai.expect(shouldFilterOffer(offer, db)).to.be.equal(false);
          // updated more than 99999 seconds ago: shouldn't pass
          rules = "generic_comparator('offer_shown','l_u_ts','>=',99999)";
          offer = updateOfferOnDB(offer.offerObj, rules);
          chai.expect(shouldFilterOffer(offer, db)).to.be.equal(true);
          // should pass again
          rules = "generic_comparator('offer_shown','l_u_ts','>=',0)";
          offer = updateOfferOnDB(offer.offerObj, rules);
          chai.expect(shouldFilterOffer(offer, db)).to.be.equal(false);
        });

        it('/shouldFilterOffer checking multiple rules with &&', function () {
          let rules = "generic_comparator('offer_closed','l_u_ts','>=',0) && "
                             + "generic_comparator('offer_shown','counter','<=',1)";
          offer = buildOffer(rules);

          chai.expect(db.addOfferObject(offer.uniqueID, offerObj)).to.be.equal(true);
          chai.expect(db.hasOfferData(offer.uniqueID)).to.be.equal(true);
          chai.expect(db.incOfferAction(offer.uniqueID, ActionID.AID_OFFER_SHOWN))
            .to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offer.uniqueID, ActionID.AID_OFFER_SHOWN).count)
            .to.be.equal(1);
          chai.expect(db.incOfferAction(offer.uniqueID, ActionID.AID_OFFER_CLOSED))
            .to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offer.uniqueID, ActionID.AID_OFFER_CLOSED).count)
            .to.be.equal(1);

          // updated more than 0 sec ago and not shown yet, should pass
          chai.expect(shouldFilterOffer(offer, db)).to.be.equal(false);
          // adding offer_shown and trying again, shouldn't pass
          chai.expect(db.incOfferAction(offer.uniqueID, ActionID.AID_OFFER_SHOWN))
            .to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offer.uniqueID, ActionID.AID_OFFER_SHOWN).count)
            .to.be.equal(2);
          chai.expect(shouldFilterOffer(offer, db)).to.be.equal(true);
          // not shown more than 2, should pass again
          rules = "generic_comparator('offer_closed','l_u_ts','>=',0) && "
                                  + "generic_comparator('offer_shown','counter','<=',2)";
          offer = buildOffer(rules);
          chai.expect(shouldFilterOffer(offer, db)).to.be.equal(false);
          // not shown more than 2 AND not updated 99999 sec ago, shouldn't pass
          rules = "generic_comparator('offer_closed','l_u_ts','>=',99999) && "
                                  + "generic_comparator('offer_shown','counter','<=',2)";
          offer = buildOffer(rules);
          chai.expect(shouldFilterOffer(offer, db)).to.be.equal(true);
          // adding extra rule and last update back to 0 ago, should pass
          rules = "generic_comparator('offer_closed','l_u_ts','>=',0) && "
                                  + "generic_comparator('offer_shown','counter','<=',2) && "
                                  + "generic_comparator('offer_closed','counter','<=',1)";
          offer = buildOffer(rules);
          chai.expect(shouldFilterOffer(offer, db)).to.be.equal(false);
          // adding offer_closed, should not pass
          chai.expect(db.incOfferAction(offer.uniqueID, ActionID.AID_OFFER_CLOSED))
            .to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offer.uniqueID, ActionID.AID_OFFER_CLOSED).count)
            .to.be.equal(2);
          chai.expect(shouldFilterOffer(offer, db)).to.be.equal(true);
        });

        it('/shouldFilterOffer checking multiple rules with ||', function () {
          let rules = "generic_comparator('offer_closed','l_u_ts','>=',0) || "
                             + "generic_comparator('offer_shown','counter','<=',1)";
          offer = buildOffer(rules);

          chai.expect(db.addOfferObject(offer.uniqueID, offerObj)).to.be.equal(true);
          chai.expect(db.hasOfferData(offer.uniqueID)).to.be.equal(true);
          chai.expect(db.incOfferAction(offer.uniqueID, ActionID.AID_OFFER_SHOWN))
            .to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offer.uniqueID, ActionID.AID_OFFER_SHOWN).count)
            .to.be.equal(1);
          chai.expect(db.incOfferAction(offer.uniqueID, ActionID.AID_OFFER_CLOSED))
            .to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offer.uniqueID, ActionID.AID_OFFER_CLOSED).count)
            .to.be.equal(1);

          // updated more than 0 sec ago and not shown yet, should pass
          chai.expect(shouldFilterOffer(offer, db)).to.be.equal(false);
          // adding offer_shown and trying again, should still pass
          chai.expect(db.incOfferAction(offer.uniqueID, ActionID.AID_OFFER_SHOWN))
            .to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offer.uniqueID, ActionID.AID_OFFER_SHOWN).count)
            .to.be.equal(2);
          chai.expect(shouldFilterOffer(offer, db)).to.be.equal(false);
          // updated more than 99999 sec ago, shouldn't pass now
          rules = "generic_comparator('offer_closed','l_u_ts','>=',99999) || "
                                  + "generic_comparator('offer_shown','counter','<=',1)";
          offer = buildOffer(rules);
          chai.expect(shouldFilterOffer(offer, db)).to.be.equal(true);
          // not shown more than 2 OR not updated 99999 sec ago, should pass again
          rules = "generic_comparator('offer_closed','l_u_ts','>=',99999) || "
                                  + "generic_comparator('offer_shown','counter','<=',2)";
          offer = buildOffer(rules);
          chai.expect(shouldFilterOffer(offer, db)).to.be.equal(false);
          // adding extra rule and reseting offer_shown <= 1, should pass
          rules = "generic_comparator('offer_closed','l_u_ts','>=',99999) || "
                                  + "generic_comparator('offer_shown','counter','<=',1) || "
                                  + "generic_comparator('offer_closed','counter','<=',1)";
          offer = buildOffer(rules);
          chai.expect(shouldFilterOffer(offer, db)).to.be.equal(false);
          // adding offer_closed, shouldn't pass
          chai.expect(db.incOfferAction(offer.uniqueID, ActionID.AID_OFFER_CLOSED))
            .to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offer.uniqueID, ActionID.AID_OFFER_CLOSED).count)
            .to.be.equal(2);
          chai.expect(shouldFilterOffer(offer, db)).to.be.equal(true);
        });

        it('/shouldFilterOffer checking multiple rules with || and &&', function () {
          let rules = "generic_comparator('offer_closed','l_u_ts','>=',0) && "
                             + "generic_comparator('offer_shown','counter','<=',0) || "
                             + "generic_comparator('offer_closed','counter','<=',0)";

          offer = buildOffer(rules);
          chai.expect(db.addOfferObject(offer.uniqueID, offerObj)).to.be.equal(true);
          chai.expect(db.hasOfferData(offer.uniqueID)).to.be.equal(true);

          // updated more than 0 sec ago and not shown yet, should pass
          chai.expect(shouldFilterOffer(offer, db)).to.be.equal(false);
          // adding offer_closed, should still pass
          chai.expect(db.incOfferAction(offer.uniqueID, ActionID.AID_OFFER_CLOSED))
            .to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offer.uniqueID, ActionID.AID_OFFER_CLOSED).count)
            .to.be.equal(1);
          chai.expect(shouldFilterOffer(offer, db)).to.be.equal(false);
          // adding offer_shown and trying again, shouldn't pass this time
          chai.expect(db.incOfferAction(offer.uniqueID, ActionID.AID_OFFER_SHOWN))
            .to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offer.uniqueID, ActionID.AID_OFFER_SHOWN).count)
            .to.be.equal(1);
          chai.expect(shouldFilterOffer(offer, db)).to.be.equal(true);
          // setting offer_shown < 2, should pass again
          rules = "generic_comparator('offer_closed','l_u_ts','>=',0) && "
                                  + "generic_comparator('offer_shown','counter','<=',1) || "
                                  + "generic_comparator('offer_closed','counter','<=',0)";
          offer = buildOffer(rules);
          chai.expect(shouldFilterOffer(offer, db)).to.be.equal(false);
          // updated more than 99999 sec ago and shown < 3, shouldn't pass now
          rules = "generic_comparator('offer_closed','l_u_ts','>=',99999) && "
                                  + "generic_comparator('offer_shown','counter','<=',1) || "
                                  + "generic_comparator('offer_closed','counter','<=',0)";
          offer = buildOffer(rules);
          chai.expect(shouldFilterOffer(offer, db)).to.be.equal(true);
        });

        // /////////////////////////////////////////////////////////////////////
        //                    count_XYZ method tests
        // /////////////////////////////////////////////////////////////////////

        it('/shouldFilterOffer checking count_campaign_offers', function () {
          let rules = "count_campaign_offers('>=',0)";

          offer = buildOffer(rules);
          chai.expect(db.addOfferObject(offer.uniqueID, offer.offerObj), 'e1').to.be.equal(true);
          chai.expect(db.hasOfferData(offer.uniqueID), 'e2').to.be.equal(true);

          // should pass
          chai.expect(shouldFilterOffer(offer, db), 'ee1').to.be.equal(false);

          // should not pass
          rules = "count_campaign_offers('>=',2)";
          offer = updateOfferOnDB(offer.offerObj, rules);
          chai.expect(shouldFilterOffer(offer, db), 'e3').to.be.equal(true);

          // add another offer of the same client and should pass
          const offer2 = buildOffer(rules);
          offer2.offerObj.offer_id = 'offer2';
          chai.expect(db.addOfferObject(offer2.uniqueID, offer2.offerObj), 'e4').to.be.equal(true);
          chai.expect(db.hasOfferData(offer2.uniqueID), 'e5').to.be.equal(true);
          chai.expect(shouldFilterOffer(offer, db), 'e6').to.be.equal(false);

          // should not pass
          rules = "count_campaign_offers('>=',3)";
          offer = updateOfferOnDB(offer.offerObj, rules);
          chai.expect(shouldFilterOffer(offer, db), 'e7').to.be.equal(true);

          // should still not pass
          const offer3 = buildOffer(rules);
          offer3.offerObj.offer_id = 'offer3';
          offer3.offerObj.campaign_id = 'cid-3';
          chai.expect(db.addOfferObject(offer3.uniqueID, offer3.offerObj), 'e7').to.be.equal(true);
          chai.expect(db.hasOfferData(offer3.uniqueID), 'e8').to.be.equal(true);
          chai.expect(shouldFilterOffer(offer, db), 'e8').to.be.equal(true);
        });
      });
    });
  });
