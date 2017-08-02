/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names,prefer-arrow-callback,arrow-body-style */

let mockedTS = Date.now();

function mockCurrentTS(ts) {
  mockedTS = ts;
}

class OfferMockHandler {
  // isOfferPresent: offerId => oidList.indexOf(offerId) >= 0,
  // sendSignal: (offerId, k) => hookedFunc(offerId, k),
  // getCampaignID: offerId => (oidList.indexOf(offerId) >= 0) ? cid : null,
  // getCampaignOffers: c => cid === c ? new Set([oidList]) : null,
  // getLatestUpdatedOffer: offersSet => [{ offer_id: 'offer1', campaign_id: cid }],
  constructor() {
    this.offers = {};
    this.cids = {};
    this.luo = null;
  }
  forceLatestUpdated(offers) {
    this.luo = offers;
  }
  addOffer(obj) {
    this.offers[obj.offer_id] = obj;
    if (!this.cids[obj.cid]) {
      this.cids[obj.cid] = new Set();
    }
    this.cids[obj.cid].add(obj.offer_id);
  }
  isOfferPresent(oid) {
    return this.offers[oid] ? true : false;
  }
  getCampaignID(oid) {
    if (!this.offers[oid]) {
      return null;
    }
    return this.offers[oid].cid;
  }
  getCampaignOffers(cid) { return this.cids[cid]; }
  getLatestUpdatedOffer(ofs) {
    if (this.luo) {
      return this.luo;
    }
    if (ofs.size === 0) {
      return null;
    }
    // return first
    const oid = ofs.values().next().value;
    return [this.offers[oid]];
  }
}

export default describeModule('offers-v2/operations/signal',
  () => ({
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
    './persistent_cache_db': {
      default: class {
        constructor(db, docName, configs) {
          this.db = db;
        }
        destroy() {}
        saveEntries() {}
        loadEntries() {}
        setEntryData(eid, data) {
          if (!this.db[eid]) {
            this.db[eid] = {
              c_ts: mockedTS,
              l_u_ts: mockedTS,
              data
            };
          } else {
            this.db[eid].data = data;
            this.db[eid].l_u_ts = mockedTS;
          }
        }
        getEntryContainer(eid)  {
          return this.db[eid];
        }
        getEntryData(eid) {
          if (!this.db[eid]) { return null; }
          return this.db[eid].data;
        }
        markEntryDirty() {}
      }
    },
  }),
  () => {
    describe('/signal operations', () => {
      let ops;
      let eventLoop;
      let resultHookedFunc;
      let resultIncOfferAction;
      let PersistentCacheDB;

      function mockEventLoop(obj) {
        eventLoop = obj;
      }

      function hookedFunc(...args) {
        resultHookedFunc = args;
      }

      function hookedIncOfferAction(...args) {
        resultIncOfferAction = args;
      }

      beforeEach(function () {
        ops = this.module().default;
        PersistentCacheDB = this.deps('./persistent_cache_db').default;
      });

      /**
       * ==================================================
       * $send_signal operation tests
       * ==================================================
       */
      describe('/send_signal', () => {
        let op;

        beforeEach(function () {
          op = ops.$send_signal;
          resultHookedFunc = undefined;
          resultIncOfferAction = undefined;
        });

        context('version 1.0', function () {
          it('/do not send signal', () => {
            mockEventLoop({
              environment: {
                isOfferPresent: offerId => false,
                sendSignal: (offerId, key) => hookedFunc(offerId, key),
                getCampaignID: () => null,
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              }
            });

            return Promise.all([
              op.call(this, ['HC1', 'key'], eventLoop).then(
                (result) => {
                  chai.expect(result).to.equal(false);
                  chai.expect(resultHookedFunc).to.equal(undefined);
                  chai.expect(resultIncOfferAction).to.equal(undefined);
                },
                (error) => {
                  chai.assert.fail(error, false, error);
                }
              ),
            ]);
          });

          it('/send signal', () => {
            mockEventLoop({
              environment: {
                isOfferPresent: offerId => true,
                sendSignal: (offerId, key) => hookedFunc(offerId, key),
                getCampaignID: offerId => 'cid',
                getCampaignOffers: cid => new Set(['HC1']),
                getLatestUpdatedOffer: offersSet => [{ offer_id: 'HC1', campaign_id: 'cid' }],
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              }
            });

            return Promise.all([
              op.call(this, ['HC1', 'key'], eventLoop).then(
                (result) => {
                  chai.expect(result).eql(true);
                  chai.expect(resultHookedFunc).eql(['HC1', 'key']);
                  // chai.expect(resultIncOfferAction).eql(['HC1', 'key']);
                },
                (error) => {
                  chai.assert.fail(error, true, error);
                }
              ),
            ]);
          });

        });

        context('version 2.0', function () {
          let sharedDbUrl;
          let sharedDbSig;
          let urlSignalsDB;
          let lastCampaignSignalDB
          let omh;
          beforeEach(function () {
            sharedDbUrl = {};
            sharedDbSig = {};
            urlSignalsDB = new PersistentCacheDB(sharedDbUrl);
            lastCampaignSignalDB = new PersistentCacheDB(sharedDbSig);
            omh = new OfferMockHandler();
          });

          // if store present then we get proper signal.
          it('/if store present then we get proper signal', () => {
            const key = 'key-name';
            const oid = 'offer-id';
            const cid = 'cid-id';
            omh.addOffer({offer_id: oid, cid});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            // send signal twice and should we get 2 different signals
            const input = ['offer-id', key, 'cid-id', {store: true}];
            const context = {'#url': 'www.google.com'};
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql(['offer-id', key]);
                resultHookedFunc = null;
                return op.call(this, input, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql(['offer-id', `repeated_${key}`]);
                    return Promise.resolve(true);
                  });
              });
          });

          it('/no store present -> send signal correct multiple times (no repeated_ is present)', () => {
            const key = 'key-name';
            const oid = 'offer-id';
            const cid = 'cid-id';
            omh.addOffer({offer_id: oid, cid});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            // send signal twice and should we get 2 different signals
            const input = [oid, key, cid];
            const context = {'#url': 'www.google.com'};
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql([oid, key]);
                resultHookedFunc = null;
                return op.call(this, input, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql([oid, key]);
                    return Promise.resolve(true);
                  });
              });
          });

          it('/store present but false -> send signal correct multiple times (no repeated_ is present)', () => {
            const key = 'key-name';
            const oid = 'offer-id';
            const cid = 'cid-id';
            omh.addOffer({offer_id: oid, cid});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            // send signal twice and should we get 2 different signals
            const input = [oid, key, cid, {store: false}];
            const context = {'#url': 'www.google.com'};
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql([oid, key]);
                resultHookedFunc = null;
                return op.call(this, input, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql([oid, key]);
                    return Promise.resolve(true);
                  });
              });
          });

          it('/store present -> simple url, first sent without repeated_, second with it.', () => {
            const key = 'key-name';
            const oid = 'offer-id';
            const cid = 'cid-id';
            omh.addOffer({offer_id: oid, cid});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            // send signal twice and should we get 2 different signals
            const input = [oid, key, cid, {store: true}];
            const context = {'#url': 'www.google.com'};
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql([oid, key]);
                resultHookedFunc = null;
                return op.call(this, input, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql([oid, `repeated_${key}`]);
                    return Promise.resolve(true);
                  });
              });
          });

          it('/store present -> 2 urls, first sent 2 times, behaves as expected, second same ', () => {
            const key = 'key-name';
            const oid = 'offer1';
            const cid = 'cid-id';
            omh.addOffer({offer_id: oid, cid});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            // send signal twice and should we get 2 different signals
            const input = ['offer1', key, 'cid1', {store: true}];
            const context = {'#url': 'www.google.com'};
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql(['offer1', key]);
                resultHookedFunc = null;
                const context = {'#url': 'www.google.com'};
                return op.call(this, input, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql(['offer1', `repeated_${key}`]);
                    resultHookedFunc = null;
                    const context = {'#url': 'www.google2.com'};
                    return op.call(this, input, eventLoop, context).then(
                      (result) => {
                        chai.expect(result).eql(true);
                        chai.expect(resultHookedFunc).eql(['offer1', key]);
                        resultHookedFunc = null;
                        const context = {'#url': 'www.google2.com'};
                        return op.call(this, input, eventLoop, context).then(
                          (result) => {
                            chai.expect(result).eql(true);
                            chai.expect(resultHookedFunc).eql(['offer1', `repeated_${key}`]);
                            return Promise.resolve(true);
                          });
                      });
                  });
              });
          });

          it('/store present -> 2 urls, first of each not repeated, second of both repeated (order not influences)', () => {
            const key = 'key-name';
            const oid = 'offer1';
            const cid = 'cid-id';
            omh.addOffer({offer_id: oid, cid});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            // send signal twice and should we get 2 different signals
            const input = ['offer1', key, cid, {store: true}];
            const context = {'#url': 'www.google.com'};
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql(['offer1', key]);
                resultHookedFunc = null;
                const context = {'#url': 'www.google2.com'};
                return op.call(this, input, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql(['offer1', key]);
                    resultHookedFunc = null;
                    const context = {'#url': 'www.google.com'};
                    return op.call(this, input, eventLoop, context).then(
                      (result) => {
                        chai.expect(result).eql(true);
                        chai.expect(resultHookedFunc).eql(['offer1', `repeated_${key}`]);
                        resultHookedFunc = null;
                        const context = {'#url': 'www.google2.com'};
                        return op.call(this, input, eventLoop, context).then(
                          (result) => {
                            chai.expect(result).eql(true);
                            chai.expect(resultHookedFunc).eql(['offer1', `repeated_${key}`]);
                            return Promise.resolve(true);
                          });
                      });
                  });
              });
          });

          it('/1 url, different campaigns, repeated works', () => {
            const key = 'key-name';
            omh.addOffer({offer_id: 'offer1', cid: 'cid1'});
            omh.addOffer({offer_id: 'offer2', cid: 'cid2'});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            // send signal twice and should we get 2 different signals
            const input = ['offer1', key, 'cid1', {store: true}];
            const context = {'#url': 'www.google.com'};
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql(['offer1', key]);
                resultHookedFunc = null;
                const input2 = ['offer2', key, 'cid2', {store: true}];
                return op.call(this, input2, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql(['offer2', `repeated_${key}`]);
                    resultHookedFunc = null;
                    // save and load both
                    return Promise.resolve(true);
                  });
              });
          });

          it('/1 url, different signal name, same offer, repeated works', () => {
            omh.addOffer({offer_id: 'offer1', cid: 'cid1'});
            omh.addOffer({offer_id: 'offer2', cid: 'cid1'});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            // send signal twice and should we get 2 different signals
            const input = ['offer1', 'key1', 'cid', {store: true}];
            const context = {'#url': 'www.google.com'};
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql(['offer1', 'key1']);
                resultHookedFunc = null;
                const input2 = ['offer1', 'key-2', 'cid', {store: true}];
                return op.call(this, input2, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql(['offer1', `repeated_key-2`]);
                    resultHookedFunc = null;
                    // save and load both
                    return Promise.resolve(true);
                  });
              });
          });


          // ////////////////////////////////////////////////////////////////////
          // filtered_last_secs tests:
          // ////////////////////////////////////////////////////////////////////

          it('/no present-> 5 consecutives times the same signal can be sent (same offer / campaign / signal)', () => {
            omh.addOffer({offer_id: 'offer1', cid: 'cid'});
            omh.addOffer({offer_id: 'offer2', cid: 'cid'});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
                timestampMS: () => mockedTS,
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            const input = ['offer1', 'key1', 'cid'];
            const context = {'#url': 'www.google.com'};
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql(['offer1', 'key1']);
                resultHookedFunc = null;
                return op.call(this, input, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql(['offer1', 'key1']);
                    resultHookedFunc = null;
                    return op.call(this, input, eventLoop, context).then(
                      (result) => {
                        chai.expect(result).eql(true);
                        chai.expect(resultHookedFunc).eql(['offer1', 'key1']);
                        resultHookedFunc = null;
                        return op.call(this, input, eventLoop, context).then(
                          (result) => {
                            chai.expect(result).eql(true);
                            chai.expect(resultHookedFunc).eql(['offer1', 'key1']);
                            resultHookedFunc = null;
                            return op.call(this, input, eventLoop, context).then(
                              (result) => {
                                chai.expect(result).eql(true);
                                chai.expect(resultHookedFunc).eql(['offer1', 'key1']);
                                resultHookedFunc = null;
                                return Promise.resolve(true);
                              });
                          });
                      });
                  });
              });
          });

          it('/present but value == 0 -> 5 consecutives times the same signal can be sent (same offer / campaign / signal)', () => {
            omh.addOffer({offer_id: 'offer1', cid: 'cid'});
            omh.addOffer({offer_id: 'offer2', cid: 'cid'});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                timestampMS: () => mockedTS,
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            const input = ['offer1', 'key1', 'cid', {filter_last_secs: 0}];
            const context = {'#url': 'www.google.com'};
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql(['offer1', 'key1']);
                resultHookedFunc = null;
                return op.call(this, input, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql(['offer1', 'key1']);
                    resultHookedFunc = null;
                    return op.call(this, input, eventLoop, context).then(
                      (result) => {
                        chai.expect(result).eql(true);
                        chai.expect(resultHookedFunc).eql(['offer1', 'key1']);
                        resultHookedFunc = null;
                        return op.call(this, input, eventLoop, context).then(
                          (result) => {
                            chai.expect(result).eql(true);
                            chai.expect(resultHookedFunc).eql(['offer1', 'key1']);
                            resultHookedFunc = null;
                            return op.call(this, input, eventLoop, context).then(
                              (result) => {
                                chai.expect(result).eql(true);
                                chai.expect(resultHookedFunc).eql(['offer1', 'key1']);
                                resultHookedFunc = null;
                                return Promise.resolve(true);
                              });
                          });
                      });
                  });
              });
          });

          it('/present-> 2 consecutive signals are not sent (same signal, cid)', () => {
            omh.addOffer({offer_id: 'offer1', cid: 'cid'});
            omh.addOffer({offer_id: 'offer2', cid: 'cid'});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                timestampMS: () => mockedTS,
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            const input = ['offer1', 'key1', 'cid', {filter_last_secs: 10}];
            const context = {'#url': 'www.google.com'};
            mockCurrentTS(1);
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql(['offer1', 'key1']);
                resultHookedFunc = null;
                mockCurrentTS(5);
                return op.call(this, input, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql(null);
                    resultHookedFunc = null;
                    return Promise.resolve(true);
                  });
              });
          });

          it('/present-> 2 consecutive signals are not sent (same signal, cid, different offers)', () => {
            omh.addOffer({offer_id: 'offer1', cid: 'cid'});
            omh.addOffer({offer_id: 'offer2', cid: 'cid'});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                timestampMS: () => mockedTS,
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            const input = ['offer1', 'key1', 'cid', {filter_last_secs: 10}];
            const context = {'#url': 'www.google.com'};
            mockCurrentTS(1);
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql(['offer1', 'key1']);
                resultHookedFunc = null;
                mockCurrentTS(5);
                const input = ['offer2', 'key1', 'cid', {filter_last_secs: 10}];
                return op.call(this, input, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql(null);
                    resultHookedFunc = null;
                    return Promise.resolve(true);
                  });
              });
          });

          it('/present-> 2 consecutive signals properly sent (different signal, same cid)', () => {
            omh.addOffer({offer_id: 'offer1', cid: 'cid'});
            omh.addOffer({offer_id: 'offer2', cid: 'cid'});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                timestampMS: () => mockedTS,
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            const input = ['offer1', 'key1', 'cid', {filter_last_secs: 10}];
            const context = {'#url': 'www.google.com'};
            mockCurrentTS(1);
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql(['offer1', 'key1']);
                resultHookedFunc = null;
                mockCurrentTS(5);
                const input = ['offer1', 'key2', 'cid', {filter_last_secs: 10}];
                return op.call(this, input, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql(['offer1', 'key2']);
                    resultHookedFunc = null;
                    return Promise.resolve(true);
                  });
              });
          });

          it('/present-> 2 consecutive signals properly sent (same signal, different cid)', () => {
            omh.addOffer({offer_id: 'offer1', cid: 'cid'});
            omh.addOffer({offer_id: 'offer2', cid: 'cid2'});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                timestampMS: () => mockedTS,
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            const input = ['offer1', 'key1', 'cid', {filter_last_secs: 10}];
            const context = {'#url': 'www.google.com'};
            mockCurrentTS(1);
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql(['offer1', 'key1']);
                resultHookedFunc = null;
                mockCurrentTS(5);
                const input = ['offer2', 'key1', 'cid2', {filter_last_secs: 10}];
                return op.call(this, input, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql(['offer2', 'key1']);
                    resultHookedFunc = null;
                    return Promise.resolve(true);
                  });
              });
          });

          it('/present-> 2 signals are sent if time threshold is bigger than argument', () => {
            omh.addOffer({offer_id: 'offer1', cid: 'cid'});
            omh.addOffer({offer_id: 'offer2', cid: 'cid'});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                timestampMS: () => mockedTS,
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            const input = ['offer1', 'key1', 'cid', {filter_last_secs: 10}];
            const context = {'#url': 'www.google.com'};
            mockCurrentTS(1);
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql(['offer1', 'key1']);
                resultHookedFunc = null;
                mockCurrentTS(15 * 1000);
                const input = ['offer1', 'key1', 'cid', {filter_last_secs: 10}];
                return op.call(this, input, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql(['offer1', 'key1']);
                    resultHookedFunc = null;
                    return Promise.resolve(true);
                  });
              });
          });

          it('/present-> 3 first sent, second filtered, third sent (threshold works after as well)', () => {
            omh.addOffer({offer_id: 'offer1', cid: 'cid'});
            omh.addOffer({offer_id: 'offer2', cid: 'cid'});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                timestampMS: () => mockedTS,
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            const input = ['offer1', 'key1', 'cid', {filter_last_secs: 10}];
            const context = {'#url': 'www.google.com'};
            mockCurrentTS(1);
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql(['offer1', 'key1']);
                resultHookedFunc = null;
                mockCurrentTS(9 * 1000);
                return op.call(this, input, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql(null);
                    resultHookedFunc = null;
                    mockCurrentTS(9 * 1000 + 11 * 1000);
                    return op.call(this, input, eventLoop, context).then(
                      (result) => {
                        chai.expect(result).eql(true);
                        chai.expect(resultHookedFunc).eql(['offer1', 'key1']);
                        resultHookedFunc = null;
                        return Promise.resolve(true);
                      });
                  });
              });
          });

          // ////////////////////////////////////////////////////////////////////
          // get_last_active_offer
          // ////////////////////////////////////////////////////////////////////

          it('/unique offer is sent properly, for different signals', () => {
            omh.addOffer({offer_id: 'offer1', cid: 'cid'});
            omh.addOffer({offer_id: 'offer2', cid: 'cid'});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                timestampMS: () => mockedTS,
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            const input = ['offer1', 'key1', 'cid'];
            const context = {'#url': 'www.google.com'};
            mockCurrentTS(1);
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql(['offer1', 'key1']);
                resultHookedFunc = null;
                const input = ['offer1', 'key2', 'cid'];
                return op.call(this, input, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql(['offer1', 'key2']);
                    resultHookedFunc = null;
                    return Promise.resolve(true);
                  });
              });
          });

          it('/2 offers different cid are sent properly', () => {
            omh.addOffer({offer_id: 'offer1', cid: 'cid'});
            omh.addOffer({offer_id: 'offer2', cid: 'cid2'});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                timestampMS: () => mockedTS,
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            const input = ['offer1', 'key1', 'cid'];
            const context = {'#url': 'www.google.com'};
            mockCurrentTS(1);
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql(['offer1', 'key1']);
                resultHookedFunc = null;
                const input = ['offer2', 'key', 'cid2'];
                return op.call(this, input, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql(['offer2', 'key']);
                    resultHookedFunc = null;
                    return Promise.resolve(true);
                  });
              });
          });

          it('/2 offers same cid, o1 latest updated is sent first, same op but o2 latest update is sent prop', () => {
            omh.addOffer({offer_id: 'offer1', cid: 'cid'});
            omh.addOffer({offer_id: 'offer2', cid: 'cid'});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                timestampMS: () => mockedTS,
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            const input = ['offer2', 'key1', 'cid'];
            const context = {'#url': 'www.google.com'};
            omh.forceLatestUpdated([{offer_id: 'offer1', cid: 'cid'}]);
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql(['offer1', 'key1']);
                resultHookedFunc = null;
                const input = ['offer1', 'key1', 'cid'];
                omh.forceLatestUpdated([{offer_id: 'offer2', cid: 'cid'}]);
                return op.call(this, input, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql(['offer2', 'key1']);
                    resultHookedFunc = null;
                    return Promise.resolve(true);
                  });
              });
          });

          // ////////////////////////////////////////////////////////////////////
          // OLD TESTS: maybe weakly implemented
          // ////////////////////////////////////////////////////////////////////
          //
          // filter_last_secs present works
          it('/filter_last_secs present not affects first simple offer', () => {
            const oid = 'offer-id';
            const cid = 'cid-id';
            const key = 'key-name';
            mockEventLoop({
              environment: {
                isOfferPresent: offerId => true,
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: offerId => cid,
                getCampaignOffers: cid => new Set([oid]),
                getLatestUpdatedOffer: offersSet => [{ offer_id: oid, campaign_id: cid }],
                timestampMS: () => mockedTS,
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            // send signal twice and should we get 2 different signals
            mockCurrentTS(1);
            let input = [oid, key, cid, {filter_last_secs: 10}];
            const context = {'#url': 'www.google.com'};
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql([oid, key]);
                return Promise.resolve(true);
              });
          });

          it('/filter_last_secs present is not filtered after the delta time', () => {
            const oid = 'offer-id';
            const cid = 'cid-id';
            const key = 'key-name';
            mockEventLoop({
              environment: {
                isOfferPresent: offerId => true,
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: offerId => cid,
                getCampaignOffers: cid => new Set([oid]),
                getLatestUpdatedOffer: offersSet => [{ offer_id: oid, campaign_id: cid }],
                timestampMS: () => mockedTS,
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            // send signal twice and should we get 2 different signals
            mockCurrentTS(1);
            let input = [oid, key, cid, {filter_last_secs: 10}];
            const context = {'#url': 'www.google.com'};
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql([oid, key]);
                resultHookedFunc = null;
                mockCurrentTS(15 * 1000);
                return op.call(this, input, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql([oid, key]);
                    return Promise.resolve(true);
                  });
              });
          });

          it('/filter_last_secs present filters the offer after the given time in seconds', () => {
            const oid = 'offer-id';
            const cid = 'cid-id';
            const key = 'key-name';
            mockEventLoop({
              environment: {
                isOfferPresent: offerId => true,
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: offerId => cid,
                getCampaignOffers: cid => new Set([oid]),
                getLatestUpdatedOffer: offersSet => [{ offer_id: oid, campaign_id: cid }],
                timestampMS: () => mockedTS,
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            // send signal twice and should we get 2 different signals
            mockCurrentTS(1);
            let input = [oid, key, cid, {filter_last_secs: 10}];
            const context = {'#url': 'www.google.com'};
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql([oid, key]);
                resultHookedFunc = null;
                mockCurrentTS(9 * 1000);
                return op.call(this, input, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql(null);
                    return Promise.resolve(true);
                  });
              });
          });

          it('/filter_last_secs present works for same offer different signal', () => {
            const oid = 'offer-id';
            const cid = 'cid-id';
            const key = 'key-name';
            mockEventLoop({
              environment: {
                isOfferPresent: offerId => true,
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: offerId => cid,
                getCampaignOffers: cid => new Set([oid]),
                getLatestUpdatedOffer: offersSet => [{ offer_id: oid, campaign_id: cid }],
                timestampMS: () => mockedTS,
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            // send signal twice and should we get 2 different signals
            mockCurrentTS(1);
            let input = [oid, key, cid, {filter_last_secs: 10}];
            const context = {'#url': 'www.google.com'};
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql([oid, key]);
                resultHookedFunc = null;
                input = [oid, 'key-2', cid, {filter_last_secs: 10}];
                return op.call(this, input, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql([oid, 'key-2']);
                    return Promise.resolve(true);
                  });
              });
          });

          it('/filter_last_secs present works for different offer same signal', () => {
            const oid = 'offer-id';
            const cid = 'cid-id';
            const key = 'key-name';
            mockEventLoop({
              environment: {
                isOfferPresent: offerId => true,
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: offerId => cid,
                getCampaignOffers: cid => new Set([oid]),
                getLatestUpdatedOffer: offersSet => [{ offer_id: oid, campaign_id: cid }],
                timestampMS: () => mockedTS,
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            // send signal twice and should we get 2 different signals
            mockCurrentTS(1);
            let input = [oid, key, cid, {filter_last_secs: 10}];
            const context = {'#url': 'www.google.com'};
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql([oid, key]);
                resultHookedFunc = null;
                input = ['offer-id2', key, cid, {filter_last_secs: 10}];
                mockCurrentTS(9 * 1000);
                return op.call(this, input, eventLoop, context).then(
                  (result) => {
                    chai.expect(result).eql(true);
                    chai.expect(resultHookedFunc).eql(null);
                    return Promise.resolve(true);
                  });
              });
          });


          // filter_last_secs present works for same offer different signal
          // filter_last_secs not present doesnt affect

          // offer id sent is the last offer active
          it('/filter_last_secs present works for different offer same signal', () => {
            const oid = 'offer-id';
            const oid2 = 'offer-id';
            const cid = 'cid-id';
            const key = 'key-name';
            mockEventLoop({
              environment: {
                isOfferPresent: offerId => true,
                sendSignal: (offerId, k) => hookedFunc(offerId, k),
                getCampaignID: offerId => cid,
                getCampaignOffers: (d) => {
                  if (d === cid) {
                    return new Set([oid, oid2])
                  }
                  return null;
                },
                getLatestUpdatedOffer: (offersSet) => {
                  if (offersSet.has(oid2)) {
                    return [{ offer_id: oid2, campaign_id: cid }];
                  }
                  return [];
                },
                timestampMS: () => mockedTS,
                incOfferAction: (offerID, actionID) => hookedIncOfferAction(offerID, actionID),
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            // send signal twice and should we get 2 different signals
            mockCurrentTS(1);
            let input = [oid, key, cid];
            const context = {'#url': 'www.google.com'};
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql([oid2, key]);
                return Promise.resolve(true);
              });
          });

          // ////////////////////////////////////////////////////////////////////
          // Referrer test ("referrer_cat": true)
          // ////////////////////////////////////////////////////////////////////
          //

          it('/no referrer cat doesnt send anything', () => {
            omh.addOffer({offer_id: 'offer1', cid: 'cid'});
            omh.addOffer({offer_id: 'offer2', cid: 'cid'});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k, ref) => hookedFunc(offerId, k, ref),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                timestampMS: () => mockedTS,
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            const input = ['offer2', 'key1', 'cid'];
            const context = {'#url': 'www.google.com', '#referrer': 'google'};
            omh.forceLatestUpdated([{offer_id: 'offer1', cid: 'cid'}]);
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql(['offer1', 'key1', null]);
                resultHookedFunc = null;
                return Promise.resolve(true);
              });
          });

          it('/referrer_Cat false doesnt send anything', () => {
            omh.addOffer({offer_id: 'offer1', cid: 'cid'});
            omh.addOffer({offer_id: 'offer2', cid: 'cid'});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k, ref) => hookedFunc(offerId, k, ref),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                timestampMS: () => mockedTS,
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            const input = ['offer2', 'key1', 'cid', { referrer_cat: false }];
            const context = {'#url': 'www.google.com', '#referrer': 'google'};
            omh.forceLatestUpdated([{offer_id: 'offer1', cid: 'cid'}]);
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql(['offer1', 'key1', null]);
                resultHookedFunc = null;
                return Promise.resolve(true);
              });
          });

          it('/referrer_cat true -> no referrer = none cat', () => {
            omh.addOffer({offer_id: 'offer1', cid: 'cid'});
            omh.addOffer({offer_id: 'offer2', cid: 'cid'});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k, ref) => hookedFunc(offerId, k, ref),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                timestampMS: () => mockedTS,
                getReferrerCat: referrerName => (referrerName) ? 'something' : 'none',
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            const input = ['offer2', 'key1', 'cid', { referrer_cat: true }];
            const context = {'#url': 'www.google.com', '#referrer': null};
            omh.forceLatestUpdated([{offer_id: 'offer1', cid: 'cid'}]);
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql(['offer1', 'key1', 'ref_none']);
                resultHookedFunc = null;
                return Promise.resolve(true);
              });
          });

          it('/referrer_cat true -> search engines = search cat', () => {
            omh.addOffer({offer_id: 'offer1', cid: 'cid'});
            omh.addOffer({offer_id: 'offer2', cid: 'cid'});
            mockEventLoop({
              environment: {
                isOfferPresent: oid => omh.isOfferPresent(oid),
                sendSignal: (offerId, k, ref) => hookedFunc(offerId, k, ref),
                getCampaignID: oid => omh.getCampaignID(oid),
                getCampaignOffers: cid => omh.getCampaignOffers(cid),
                getLatestUpdatedOffer: ose => omh.getLatestUpdatedOffer(ose),
                timestampMS: () => mockedTS,
                getReferrerCat: referrerName => 'search',
              },
              urlSignalsDB,
              lastCampaignSignalDB,
            });

            const input = ['offer2', 'key1', 'cid', { referrer_cat: true }];
            const context = {'#url': 'www.google.com', '#referrer': 'google'};
            omh.forceLatestUpdated([{offer_id: 'offer1', cid: 'cid'}]);
            return op.call(this, input, eventLoop, context).then(
              (result) => {
                chai.expect(result).eql(true);
                chai.expect(resultHookedFunc).eql(['offer1', 'key1', 'ref_search']);
                resultHookedFunc = null;
                return Promise.resolve(true);
              });
          });
        });

      });
    });
  },
);
