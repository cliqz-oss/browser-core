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
const CH = 'offers-send-ch';


export default describeModule('offers-v2/offer_processor',
  () => ({
    './logging_handler': {
      default: {}
      // LOG_ENABLED: true,
      // default: class LoggingHandler{
      //   error(mod, msg) {
      //     console.log(mod, msg);
      //   },
      //   warning(mod, msg) {
      //     console.log(mod, msg);
      //   }
      // }
    },
    'core/platform': {
      isChromium: false
    },
    'core/crypto/random': {
      random: function () {
        return Math.random();
      }
    },
    'core/cliqz': {
      default: {},
      utils: {
        setInterval: function() {},
      }
    },
    'platform/console': {
      default: {},
    },
    'core/events': {
      default: {
        msgs: {},
        sub(channel, fun) {
          // we dont care about functions subscriber or anything just get the
          // messages and store them to process them later
          if (!this.msgs[channel]) {
            this.msgs[channel] = [];
          }
        },
        un_sub() {
        },
        pub(ch, msg) {
          if (!this.msgs[ch]) {
            this.msgs[ch] = [];
          }
          this.msgs[ch].push(msg);
        },

        // helper methods
        clearAll() {
          this.msgs = {};
        },
        countMsgs(ch) {
          return !this.msgs[ch] ? 0 : this.msgs[ch].length;
        }

      }
    },
    './signals_handler': {
      default: class {
        constructor(db) {
          this.db = {
            campaign: {},
            action: {}
          };
        }
        destroy() {}
        savePersistenceData() {}

        setCampaignSignal(cid, oid, origID, sid) {
          let cidm = this.db['campaign'][cid];
          if (!cidm) {
            cidm = this.db['campaign'][cid] = {};
          }
          let oidm = cidm[oid];
          if (!oidm) {
            oidm = cidm[oid] = {};
          }
          let origm = oidm[origID];
          if (!origm) {
            origm = oidm[origID] = {};
          }
          if (!origm[sid]) {
            origm[sid] = 1;
          } else {
            origm[sid] += 1;
          }
        }

        setActionSignal(actionID, origID) {
          let origm = this.db['action'][origID];
          if (!origm) {
            origm = this.db['action'][origID] = {};
          }
          if (!origID[actionID]) {
            origID[actionID] = 1;
          } else {
            origID[actionID] += 1;
          }
        }

        // helper methods to get some values
        getCampaignSignal(cid, oid, origID, sid) {
          let m = this.db['campaign'][cid];
          if (!m) {return null;}
          m = m[oid];
          if (!m) {return null;}
          m = m[origID];
          if (!m) {return null;}
          return m[sid];
        }
        getCampaignSignalsCount() {
          return Object.keys(this.db['campaign']).length;
        }

        getActionSignal(actionID, origID) {
          let m = this.db['action'][origID];
          if (!m) {return null;}
          return m[actionID];
        }
        getActionSignalCount() {
          return Object.keys(this.db['action']).length;
        }
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
    },
    './filter_rules_evaluator': {
      default: class {
        constructor() {
          this.shouldShow = true;
        }
        shouldWeShowOffer() {
          return this.shouldShow;
        }
        setShouldShow(ss) {
          this.shouldShow = ss;
        }
      }
    }
  }),
  () => {
    describe('OffersProcessor', function() {
      let OfferProcessor;
      let OfferDB;
      let events;
      let SignalHandler;
      let ActionID;
      beforeEach(function () {
        OfferProcessor = this.module().default;
        SignalHandler = this.deps('./signals_handler').default;
        events = this.deps('core/events').default;
        return Promise.all([
          System.import('offers-v2/offers_db'),
          System.import('offers-v2/actions_defs')]).then((mod) => {
          OfferDB = mod[0].default;
          ActionID = mod[1].default;
        });
      });

      describe('#offers_proc', function () {
        context('basic checks', function () {
          // the offerDB
          let db;
          // the offer processor instance
          let op;
          // the sighandler instance of the offer processor
          let sigh;
          // the filtering rule evaluator moc
          let fre;
          beforeEach(function () {
            db = new OfferDB({});
            sigh = new SignalHandler(db);
            op = new OfferProcessor(sigh, null, db);
            fre = op.filterRuleEval;
            // clear all
            events.clearAll();
          });

          function cloneValidOffer() {
            return JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
          }

          it('check instances exists', function () {
            chai.expect(db).to.exist;
            chai.expect(op).to.exist;
            chai.expect(sigh).to.exist;
            chai.expect(fre).to.exist;
          });

          it('cannot add invalid offers', function () {
            chai.expect(op.pushOffer(null)).to.be.equal(false);
            chai.expect(op.pushOffer(undefined)).to.be.equal(false);
            chai.expect(op.pushOffer({})).to.be.equal(false);
          });

          it('cannot add offer without required fields missing', function () {
            // no offer id
            let offer = cloneValidOffer();
            delete offer.offer_id;
            chai.expect(op.pushOffer(offer)).to.be.equal(false);

            // no campaign id
            offer = cloneValidOffer();
            delete offer.campaign_id;
            chai.expect(op.pushOffer(offer)).to.be.equal(false);

            // not display id
            offer = cloneValidOffer();
            delete offer.display_id;
            chai.expect(op.pushOffer(offer)).to.be.equal(false);
          });

          // check adding invalid offer doesnt emit any event nor signal?
          it('invalid offer doesnt emit any event', function () {
            // no offer id
            let offer = cloneValidOffer();
            delete offer.offer_id;
            chai.expect(op.pushOffer(offer)).to.be.equal(false);
            chai.expect(events.countMsgs(CH)).to.be.equal(0);
          });

          // TODO: check that no signals are sent to the signals handler neither?

          // check can add offer
          it('valid offer can be added', function () {
            let offer = cloneValidOffer();
            chai.expect(op.pushOffer(offer)).to.be.equal(true);
          });

          // check adding offer got proper event
          it('valid offer added emit proper events', function () {
            let offer = cloneValidOffer();
            chai.expect(op.pushOffer(offer)).to.be.equal(true);
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
            let offer = cloneValidOffer();
            delete offer.offer_id;
            chai.expect(sigh.getCampaignSignalsCount()).to.be.equal(0);
            chai.expect(sigh.getActionSignalCount()).to.be.equal(0);
            chai.expect(op.pushOffer(offer)).to.be.equal(false);
            chai.expect(sigh.getCampaignSignalsCount()).to.be.equal(0);
            chai.expect(sigh.getActionSignalCount()).to.be.equal(0);
          });

          it('signal offer triggered is emitted on proper offer', function () {
            let offer = cloneValidOffer();
            chai.expect(sigh.getCampaignSignalsCount()).to.be.equal(0);
            chai.expect(sigh.getActionSignalCount()).to.be.equal(0);
            chai.expect(op.pushOffer(offer)).to.be.equal(true);
            chai.expect(sigh.getCampaignSignalsCount()).to.be.equal(1);
            chai.expect(sigh.getActionSignalCount()).to.be.equal(0);
            const sigVal = sigh.getCampaignSignal(offer.campaign_id,
                                                  offer.offer_id,
                                                  'processor',
                                                  ActionID.AID_OFFER_TRIGGERED);
            chai.expect(sigVal).to.be.equal(1);
          });

          // check filtered out signal is properly sent
          it('signal offer filtered is emitted on filtered offer', function () {
            let offer = cloneValidOffer();
            fre.setShouldShow(false);
            chai.expect(sigh.getCampaignSignalsCount()).to.be.equal(0);
            chai.expect(sigh.getActionSignalCount()).to.be.equal(0);
            chai.expect(op.pushOffer(offer)).to.be.equal(false);
            chai.expect(sigh.getCampaignSignalsCount()).to.be.equal(1);
            chai.expect(sigh.getActionSignalCount()).to.be.equal(0);
            const sigVal = sigh.getCampaignSignal(offer.campaign_id,
                                                  offer.offer_id,
                                                  'processor',
                                                  ActionID.AID_OFFER_FILTERED);
            chai.expect(sigVal).to.be.equal(1);
          });

          // check pushed offer signal is properly sent
          it('signal offer filtered is emitted on filtered offer', function () {
            let offer = cloneValidOffer();
            chai.expect(sigh.getCampaignSignalsCount()).to.be.equal(0);
            chai.expect(sigh.getActionSignalCount()).to.be.equal(0);
            chai.expect(op.pushOffer(offer)).to.be.equal(true);
            chai.expect(sigh.getCampaignSignalsCount()).to.be.equal(1);
            chai.expect(sigh.getActionSignalCount()).to.be.equal(0);
            let sigVal = sigh.getCampaignSignal(offer.campaign_id,
                                                offer.offer_id,
                                                'processor',
                                                ActionID.AID_OFFER_TRIGGERED);
            chai.expect(sigVal).to.be.equal(1);
            sigVal = sigh.getCampaignSignal(offer.campaign_id,
                                            offer.offer_id,
                                            'processor',
                                            ActionID.AID_OFFER_PUSHED);
            chai.expect(sigVal).to.be.equal(1);
          });

          // TODO: check removed offer sent AID_OFFER_DB_REMOVED signal

          // check can update offer?
          // check display offer

          // check the different APIs get methods

          // do more complex tests sending signals from outside sending messages
          // and getting the responses

        });

      });
    })
  }
);
