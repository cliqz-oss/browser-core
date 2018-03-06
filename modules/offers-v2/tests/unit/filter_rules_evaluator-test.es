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
    "not_clicked_last_secs": 20,
    "eval_expression" : "generic_comparator('offer_closed','l_u_ts','>=',30) && " +
                        "generic_comparator('offer_shown','counter','<=',5)"
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


export default describeModule('offers-v2/filter_rules_evaluator',
  () => ({
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
      isChromium: false
    },
    'core/helpers/timeout': {
      default: function() { const stop = () => {}; return { stop }; }
    },
    'core/cliqz': {
      default: {
        setInterval: function () {}
      },
      utils: {
        setInterval: function () {}
      }
    },
    'core/crypto/random': {
    },
    'platform/console': {
      default: {}
    },
    'offers-v2/db_helper': {
      default: class {
        constructor(db) {
          this.db = {};
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

        removeDocData(docID) {
          const self = this;
          return new Promise((resolve, reject) => {
            if (self.db[docID]) {
              delete self.db[docID];
            }
            resolve(true);
          });
        }
      }
    }
  }),
  () => {
    describe('#filter_rules_evaluator', function() {
      let DBHelper;
      let OfferDB;
      let FilterRulesEvaluator;
      let ActionID;
      beforeEach(function () {
        FilterRulesEvaluator = this.module().default;
        DBHelper = this.deps('offers-v2/db_helper').default;
        const p1 = this.system.import('offers-v2/offers_db');
        const p2 = this.system.import('offers-v2/actions_defs');
        return Promise.all([p1,p2]).then((mods) => {
          OfferDB = mods[0].default;
          ActionID = mods[1].default;
        });
      });

      context('basic tests', function () {
        let db;
        let fer;
        let offerObj;
        beforeEach(function () {
          db = new OfferDB({});
          fer = new FilterRulesEvaluator(db);
          offerObj = JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
        });

        it('test FilterRulesEvaluator exists', function () {
          chai.expect(fer).to.exist;
          // testDB.saveDocData('agu', {a: 2});
          // return testDB.getDocData('agu').then((d) => {
          //   chai.expect(d).to.exist;
          //   chai.expect(d.a).to.exist;
          //   chai.expect(d.a).to.be.equal(2);
          // });
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

        it('test invalid args', function () {
          chai.expect(fer.shouldWeShowOffer(null, null)).to.be.equal(false);
          chai.expect(fer.shouldWeShowOffer(null, {})).to.be.equal(false);
          chai.expect(fer.shouldWeShowOffer(undefined, null)).to.be.equal(false);
          chai.expect(fer.shouldWeShowOffer(undefined, {})).to.be.equal(false);
          chai.expect(fer.shouldWeShowOffer('', {})).to.be.equal(false);
        });

        it('rules for not existing offer', function () {
          // if the offer doesn't exist on the DB then we should show it
          chai.expect(fer.shouldWeShowOffer('whatever-offer-id', {})).to.be.equal(true);
          chai.expect(fer.shouldWeShowOffer('whatever-offer-id', null)).to.be.equal(true);
        });

        it('empty rules for existing offer', function () {
          chai.expect(db.addOfferObject(offerObj.offer_id, offerObj)).to.be.equal(true);
          chai.expect(db.hasOfferData(offerObj.offer_id)).to.be.equal(true);
          chai.expect(db.isOfferPresent(offerObj.offer_id)).to.be.equal(true);

          // if the offer doesn't exist on the DB then we should show it
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, {})).to.be.equal(true);
        });

        //

        it('checking rule offer_closed < X', function () {
          chai.expect(db.addOfferObject(offerObj.offer_id, offerObj)).to.be.equal(true);
          chai.expect(db.hasOfferData(offerObj.offer_id)).to.be.equal(true);

          // not expect to pass
          const rules = {
            // old syntax, should do nothing
            not_closed_mt: 0,
            eval_expression: "generic_comparator('offer_closed','counter','<=',0)"
          };
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(true);
          rules.eval_expression = "generic_comparator('offer_closed','counter','<=',3)";
          delete rules.jsep_built;
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(true);
          // add the actions on the DB
          chai.expect(db.incOfferAction(offerObj.offer_id, ActionID.AID_OFFER_CLOSED)).to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offerObj.offer_id, ActionID.AID_OFFER_CLOSED).count).to.be.equal(1);
          // now should fail since we expect to not be closed more than 0 times
          rules.eval_expression = "generic_comparator('offer_closed','counter','<=',0)";
          delete rules.jsep_built;
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(false);
          // now should pass
          rules.eval_expression = "generic_comparator('offer_closed','counter','<=',1)";
          delete rules.jsep_built;
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(true);
          rules.eval_expression = "generic_comparator('offer_closed','counter','<=',2)";
          delete rules.jsep_built;
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(true);
          // increase 2 more times
          chai.expect(db.incOfferAction(offerObj.offer_id, ActionID.AID_OFFER_CLOSED)).to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offerObj.offer_id, ActionID.AID_OFFER_CLOSED).count).to.be.equal(2);
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(true);
          chai.expect(db.incOfferAction(offerObj.offer_id, ActionID.AID_OFFER_CLOSED)).to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offerObj.offer_id, ActionID.AID_OFFER_CLOSED).count).to.be.equal(3);
          // it should fail again
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(false);
        });


        it('checking rule offer_shown > X sec ago', function () {
          chai.expect(db.addOfferObject(offerObj.offer_id, offerObj)).to.be.equal(true);
          chai.expect(db.hasOfferData(offerObj.offer_id)).to.be.equal(true);
          chai.expect(db.incOfferAction(offerObj.offer_id, ActionID.AID_OFFER_SHOWN)).to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offerObj.offer_id, ActionID.AID_OFFER_SHOWN).count).to.be.equal(1);

          const rules = {
            not_added_mt: 0,
            eval_expression: "generic_comparator('offer_shown','l_u_ts','>=',0)"
          };
          // updated more than 0 seconds ago: pass
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(true);
          // updated more than 99999 seconds ago: shouldn't pass
          rules.eval_expression = "generic_comparator('offer_shown','l_u_ts','>=',99999)";
          delete rules.jsep_built;
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(false);
          // should pass again
          rules.eval_expression = "generic_comparator('offer_shown','l_u_ts','>=',0)";
          delete rules.jsep_built;
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(true);
        });

        it('checking multiple rules with &&', function () {
          chai.expect(db.addOfferObject(offerObj.offer_id, offerObj)).to.be.equal(true);
          chai.expect(db.hasOfferData(offerObj.offer_id)).to.be.equal(true);
          chai.expect(db.incOfferAction(offerObj.offer_id, ActionID.AID_OFFER_SHOWN)).to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offerObj.offer_id, ActionID.AID_OFFER_SHOWN).count).to.be.equal(1);
          chai.expect(db.incOfferAction(offerObj.offer_id, ActionID.AID_OFFER_CLOSED)).to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offerObj.offer_id, ActionID.AID_OFFER_CLOSED).count).to.be.equal(1);

          const rules = {
            eval_expression: "generic_comparator('offer_closed','l_u_ts','>=',0) && " +
                             "generic_comparator('offer_shown','counter','<=',1)"
          };
          // updated more than 0 sec ago and not shown yet, should pass
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(true);
          // adding offer_shown and trying again, shouldn't pass
          chai.expect(db.incOfferAction(offerObj.offer_id, ActionID.AID_OFFER_SHOWN)).to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offerObj.offer_id, ActionID.AID_OFFER_SHOWN).count).to.be.equal(2);
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(false);
          // not shown more than 2, should pass again
          rules.eval_expression = "generic_comparator('offer_closed','l_u_ts','>=',0) && " +
                                  "generic_comparator('offer_shown','counter','<=',2)"
          delete rules.jsep_built;
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(true);
          // not shown more than 2 AND not updated 99999 sec ago, shouldn't pass
          rules.eval_expression = "generic_comparator('offer_closed','l_u_ts','>=',99999) && " +
                                  "generic_comparator('offer_shown','counter','<=',2)"
          delete rules.jsep_built;
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(false);
          // adding extra rule and last update back to 0 ago, should pass
          rules.eval_expression = "generic_comparator('offer_closed','l_u_ts','>=',0) && " +
                                  "generic_comparator('offer_shown','counter','<=',2) && " +
                                  "generic_comparator('offer_closed','counter','<=',1)"
          delete rules.jsep_built;
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(true);
          // adding offer_closed, should not pass
          chai.expect(db.incOfferAction(offerObj.offer_id, ActionID.AID_OFFER_CLOSED)).to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offerObj.offer_id, ActionID.AID_OFFER_CLOSED).count).to.be.equal(2);
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(false);
        });

        it('checking multiple rules with ||', function () {
          chai.expect(db.addOfferObject(offerObj.offer_id, offerObj)).to.be.equal(true);
          chai.expect(db.hasOfferData(offerObj.offer_id)).to.be.equal(true);
          chai.expect(db.incOfferAction(offerObj.offer_id, ActionID.AID_OFFER_SHOWN)).to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offerObj.offer_id, ActionID.AID_OFFER_SHOWN).count).to.be.equal(1);
          chai.expect(db.incOfferAction(offerObj.offer_id, ActionID.AID_OFFER_CLOSED)).to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offerObj.offer_id, ActionID.AID_OFFER_CLOSED).count).to.be.equal(1);

          const rules = {
            eval_expression: "generic_comparator('offer_closed','l_u_ts','>=',0) || " +
                             "generic_comparator('offer_shown','counter','<=',1)"
          };
          // updated more than 0 sec ago and not shown yet, should pass
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(true);
          // adding offer_shown and trying again, should still pass
          chai.expect(db.incOfferAction(offerObj.offer_id, ActionID.AID_OFFER_SHOWN)).to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offerObj.offer_id, ActionID.AID_OFFER_SHOWN).count).to.be.equal(2);
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(true);
          // updated more than 99999 sec ago, shouldn't pass now
          rules.eval_expression = "generic_comparator('offer_closed','l_u_ts','>=',99999) || " +
                                  "generic_comparator('offer_shown','counter','<=',1)"
          delete rules.jsep_built;
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(false);
          // not shown more than 2 OR not updated 99999 sec ago, should pass again
          rules.eval_expression = "generic_comparator('offer_closed','l_u_ts','>=',99999) || " +
                                  "generic_comparator('offer_shown','counter','<=',2)"
          delete rules.jsep_built;
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(true);
          // adding extra rule and reseting offer_shown <= 1, should pass
          rules.eval_expression = "generic_comparator('offer_closed','l_u_ts','>=',99999) || " +
                                  "generic_comparator('offer_shown','counter','<=',1) || " +
                                  "generic_comparator('offer_closed','counter','<=',1)"
          delete rules.jsep_built;
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(true);
          // adding offer_closed, shouldn't pass
          chai.expect(db.incOfferAction(offerObj.offer_id, ActionID.AID_OFFER_CLOSED)).to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offerObj.offer_id, ActionID.AID_OFFER_CLOSED).count).to.be.equal(2);
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(false);
        });

        it('checking multiple rules with || and &&', function () {
          chai.expect(db.addOfferObject(offerObj.offer_id, offerObj)).to.be.equal(true);
          chai.expect(db.hasOfferData(offerObj.offer_id)).to.be.equal(true);

          const rules = {
            eval_expression: "generic_comparator('offer_closed','l_u_ts','>=',0) && " +
                             "generic_comparator('offer_shown','counter','<=',0) || " +
                             "generic_comparator('offer_closed','counter','<=',0)"
          };
          // updated more than 0 sec ago and not shown yet, should pass
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(true);
          // adding offer_closed, should still pass
          chai.expect(db.incOfferAction(offerObj.offer_id, ActionID.AID_OFFER_CLOSED)).to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offerObj.offer_id, ActionID.AID_OFFER_CLOSED).count).to.be.equal(1);
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(true);
          // adding offer_shown and trying again, shouldn't pass this time
          chai.expect(db.incOfferAction(offerObj.offer_id, ActionID.AID_OFFER_SHOWN)).to.be.equal(true);
          chai.expect(db.getOfferActionMeta(offerObj.offer_id, ActionID.AID_OFFER_SHOWN).count).to.be.equal(1);
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(false);
          // setting offer_shown < 2, should pass again
          rules.eval_expression = "generic_comparator('offer_closed','l_u_ts','>=',0) && " +
                                  "generic_comparator('offer_shown','counter','<=',1) || " +
                                  "generic_comparator('offer_closed','counter','<=',0)"
          delete rules.jsep_built;
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(true);
          // updated more than 99999 sec ago and shown < 3, shouldn't pass now
          rules.eval_expression = "generic_comparator('offer_closed','l_u_ts','>=',99999) && " +
                                  "generic_comparator('offer_shown','counter','<=',1) || " +
                                  "generic_comparator('offer_closed','counter','<=',0)"
          delete rules.jsep_built;
          chai.expect(fer.shouldWeShowOffer(offerObj.offer_id, rules)).to.be.equal(false);
        });

      });
    });
  }
);
