/* global chai */
/* global describeModule */
/* global require */
/* eslint no-param-reassign: off */

const tldjs = require('tldjs');

const VALID_OFFER_OBJ = {
  action_info: {
    on_click: 'https://www.cliqz.com'
  },
  campaign_id: 'cid_1',
  client_id: 'client-1',
  display_id: 'x-d',
  filterRules: "generic_comparator('offer_closed','l_u_ts','>=',30) && " +
                 "generic_comparator('offer_shown','counter','<=',5)",
  offer_id: 'x',
  rule_info: {
    display_time_secs: 999999,
    type: 'exact_match',
    url: []
  },
  ui_info: {
    template_data: {
      call_to_action: {
        target: '',
        text: 'Jetzt Anfordern',
        url: 'http://newurl'
      },
      conditions: 'Some conditions',
      desc: 'Some description',
      logo_url: 'somelogourl',
      title: 'This is the title',
      voucher_classes: ''
    },
    template_name: 'ticket_template'
  },
  rs_dest: ['offers-cc'],
  types: ['type1', 'type2'],
  monitorData: [],
};
const CH = 'offers-send-ch';

// needed for the map
const persistence = {};
function delay(fn) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      Promise.resolve()
        .then(fn)
        .then(resolve)
        .catch(reject);
    }, 100);
  });
}


export default describeModule('offers-v2/offers/offers-api',
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
    'core/crypto/random': {
      random: function () {
        return Math.random();
      }
    },
    'platform/globals': {
    },
    'platform/lib/tldjs': {
      default: tldjs,
    },
    'core/utils': {
      default: {}
    },
    'core/helpers/timeout': {
      default: function () { const stop = () => {}; return { stop }; }
    },
    'platform/console': {
      default: {},
    },
    'core/prefs': {
      default: {
        get() {}
      },
    },
    'core/events': {
      default: {
        msgs: {},
        sub(channel) {
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
    'offers-v2/signals/signals_handler': {
      default: class {
        constructor() {
          this.db = {
            campaign: {},
            action: {}
          };
        }
        destroy() {}
        savePersistenceData() {}

        setCampaignSignal(cid, oid, origID, sid) {
          let cidm = this.db.campaign[cid];
          if (!cidm) {
            cidm = {};
            this.db.campaign[cid] = cidm;
          }
          let oidm = cidm[oid];
          if (!oidm) {
            oidm = {};
            cidm[oid] = oidm;
          }
          let origm = oidm[origID];
          if (!origm) {
            origm = {};
            oidm[origID] = origm;
          }
          if (!origm[sid]) {
            origm[sid] = 1;
          } else {
            origm[sid] += 1;
          }
        }

        setActionSignal(actionID, origID) {
          let origm = this.db.action[origID];
          if (!origm) {
            origm = {};
            this.db.action[origID] = origm;
          }
          if (!origID[actionID]) {
            origID[actionID] = 1;
          } else {
            origID[actionID] += 1;
          }
        }

        // helper methods to get some values
        getCampaignSignal(cid, oid, origID, sid) {
          let m = this.db.campaign[cid];
          if (!m) { return null; }
          m = m[oid];
          if (!m) { return null; }
          m = m[origID];
          if (!m) { return null; }
          return m[sid];
        }
        getCampaignSignalsCount() {
          return Object.keys(this.db.campaign).length;
        }

        getActionSignal(actionID, origID) {
          const m = this.db.action[origID];
          if (!m) { return null; }
          return m[actionID];
        }
        getActionSignalCount() {
          return Object.keys(this.db.action).length;
        }
      }
    },
    'core/persistence/map': {
      default: class MockMap {
        constructor(dbName) {
          persistence[dbName] = (persistence[dbName] || new Map());
          this.db = persistence[dbName];
        }

        init() {
          return Promise.resolve();
        }

        unload() {
          return Promise.resolve();
        }

        get(key) {
          return delay(() => this.db.get(key));
        }

        set(key, value) {
          return delay(() => this.db.set(key, value));
        }

        has(key) {
          return delay(() => this.db.has(key));
        }

        delete(key) {
          return delay(() => this.db.delete(key));
        }

        clear() {
          return delay(() => this.db.clear());
        }

        size() {
          return delay(() => this.db.size());
        }

        keys() {
          return delay(() => [...this.db.keys()]);
        }

        entries() {
          return delay(() => [...this.db.entries()]);
        }
      }
    }
  }),
  () => {
    describe('OffersAPI', function () {
      let OfferProcessor;
      let OfferDB;
      let events;
      let SignalHandler;
      let ActionID;
      let Offer;

      beforeEach(function () {
        OfferProcessor = this.module().default;
        SignalHandler = this.deps('offers-v2/signals/signals_handler').default;
        events = this.deps('core/events').default;
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
            db = new OfferDB({});
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

          // TODO: check removed offer sent AID_OFFER_DB_REMOVED signal

          // check can update offer?
          // check display offer

          // check the different APIs get methods

          // do more complex tests sending signals from outside sending messages
          // and getting the responses
        });
      });
    });
  }
);
