/* global chai */
/* global describeModule */
/* global require */

class SenderMock {
  constructor() {
    this.signals = [];
    this.errSignals = [];
    this.sendError = false;
  }

  httpPost(url, successCb, signal, errCb, to) {
    if (this.isAsync) {
      setTimeout(() => {
        if (this.sendError) {
          this.errSignals.push(JSON.parse(signal));
          if (errCb) {
            errCb({ error: 'failed' });
          }
        } else {
          this.signals.push(JSON.parse(signal));
          if (successCb) {
            successCb({});
          }
        }
      }, 10);
    } else {
      if (this.sendError) {
        this.errSignals.push(JSON.parse(signal));
        if (errCb) {
          errCb({ error: 'failed' });
        }
      } else {
        this.signals.push(JSON.parse(signal));
        if (successCb) {
          successCb({});
        }
      }
    }
  }

  clear() {
    this.signals = [];
    this.errSignals = [];
  }

  makeSentFail(fail) {
    this.sendError = fail;
  }

  makeAsync(isAsync) {
    this.isAsync = isAsync;
  }
}


function asyncInvoke(f, timeoutMS) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      f();
      resolve();
    }, timeoutMS);
  });
}

export default describeModule('offers-v2/signals_handler',
  () => ({
    './logging_handler': {
      default: {
        LOG_ENABLED: true,
        error: function(mod, msg) {
          // console.log(mod, msg);
        },
        warning: function(mod, msg) {
          // console.log(mod, msg);
        },
        info: function(mod, msg) {
          // console.log(mod, msg);
        }
      }
    },
    'core/platform': {
      isChromium: false
    },
    'core/cliqz': {
      default: {
        setInterval: function () {}
      },
      utils: {
        setInterval: function () {},
        getLocalStorage: function() { return null; },
        getPref(n,v) { return v; },
        telemetry() {}
      }
    },
    'platform/console': {
      default: {}
    },
    'platform/crypto': {
      default: {}
    },
    'core/crypto/random': {
      random: function () {
        return Math.random();
      }
    },
    './utils': {
      generateUUID: function() {
        return Math.random();
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
    describe('#signal_handler', function() {
      let SignalHandler;
      let ActionID;
      let OffersConfigs;
      beforeEach(function () {
        SignalHandler = this.module().SignalHandler;
        const p1 = System.import('offers-v2/offers_configs');
        const p2 = System.import('offers-v2/actions_defs');
        return Promise.all([p1, p2]).then((mods) => {
          OffersConfigs = mods[0].default;
          OffersConfigs.MAX_RETRIES = 3;
          ActionID = mods[1].default;
        });
      });

      // helper method to check campaign signal value after being sent
      function checkCampaignVal(sig, expectedVal, cid, oid, origID, sid) {
        chai.expect(sig).to.exist;
        const pl = sig.payload;
        chai.expect(pl).to.exist;
        chai.expect(pl.type).to.equal('campaign');
        const d = pl.data;
        chai.expect(d).to.exist;
        chai.expect(d.c_id).to.be.equal(cid);
        const cdata = d.c_data;
        chai.expect(cdata).to.exist;
        chai.expect(cdata.offers).to.exist;

        // check if we have an offer with that id
        let offer = null;
        cdata.offers.forEach((o) => {
          if (offer) {
            return;
          }
          if (o.offer_id === oid) {
            offer = o;
          }
        });
        chai.expect(offer).to.exist;
        chai.expect(offer.offer_data).to.exist;
        let valueFound = false;
        offer.offer_data.forEach((oe) => {
          if (valueFound) {
            return;
          }
          if (oe.origin === origID) {
            chai.expect(oe.origin_data).to.exist;
            chai.expect(oe.origin_data[sid]).to.exist;
            chai.expect(oe.origin_data[sid]).to.be.equal(expectedVal);
            valueFound = true;
          }
        });
        chai.expect(valueFound).to.be.equal(true);
      }

      function checkActionVal(sig, expectedVal, actionID, origID) {
        chai.expect(sig).to.exist;
        const pl = sig.payload;
        chai.expect(pl).to.exist;
        chai.expect(pl.type).to.equal('action');
        const d = pl.data;
        chai.expect(d).to.exist;
        chai.expect(d.o_id).to.be.equal(origID);
        const cdata = d.o_data;
        chai.expect(cdata).to.exist;
        chai.expect(cdata.actions).to.exist;

        // check if we have an offer with that id
        chai.expect(cdata.actions[actionID]).to.exist;
        chai.expect(cdata.actions[actionID]).to.equal(expectedVal);
      }

      // helper method to check seq number of campaign signal
      function checkCampaignSeq(sig, expectedVal, cid) {
        chai.expect(sig).to.exist;
        const pl = sig.payload;
        chai.expect(pl).to.exist;
        chai.expect(pl.type).to.equal('campaign');
        const d = pl.data;
        chai.expect(d).to.exist;
        chai.expect(d.c_id).to.be.equal(cid);
        const cdata = d.c_data;
        chai.expect(cdata).to.exist;
        chai.expect(cdata.seq).to.be.equal(expectedVal);
      }

      function getGenElement(d, exp) {
        let expList = exp.split('/');
        if (expList.length === 0) {
          return null;
        }
        const curr = expList[0];
        expList = expList.slice(1);
        const d2 = d[curr];
        if (expList.length === 0) {
          return d2;
        }
        return getGenElement(d2, expList.join('/'));
      }

      function getCampaignIDFromSig(sig) {
        return getGenElement(sig, 'payload/data/c_id');
      }

      function getCampaignUCIDFromSig(sig) {
        return getGenElement(sig, 'payload/data/c_data/ucid');
      }

      context('basic tests', function () {
        let sm;
        beforeEach(function () {
          sm = new SenderMock();
        });

        it('test missing arguments doesnt add campaign signals', function () {
          let sh = new SignalHandler({}, sm);
          chai.expect(sh.setCampaignSignal()).to.be.equal(false);
          chai.expect(sh.setCampaignSignal('x')).to.be.equal(false);
          chai.expect(sh.setCampaignSignal('x','y')).to.be.equal(false);
          chai.expect(sh.setCampaignSignal('x','y','z')).to.be.equal(false);
        });

        it('test missing arguments doesnt add action signals', function () {
          let sh = new SignalHandler({}, sm);
          chai.expect(sh.setActionSignal()).to.be.equal(false);
          chai.expect(sh.setActionSignal('x')).to.be.equal(false);
        });

        it('test missing arguments doesnt add action signals', function () {
          let sh = new SignalHandler({}, sm);
          chai.expect(sh.setActionSignal()).to.be.equal(false);
          chai.expect(sh.setActionSignal('x')).to.be.equal(false);
        });

        // to test that signals are being properly added we will check when sending
        // to the backend that we get on the mock the proper signal
        it('add campaign signal works', function () {
          let sh = new SignalHandler({}, sm);
          chai.expect(sh.setCampaignSignal('x', 'y', 'z', 'w')).to.be.equal(true);
          chai.expect(sm.signals.length).to.be.equal(0);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(1);
        });

        it('add campaign signal with different counters works', function () {
          let sh = new SignalHandler({}, sm);
          chai.expect(sh.setCampaignSignal('x', 'y', 'z', 'w0')).to.be.equal(true);
          chai.expect(sm.signals.length).to.be.equal(0);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(1);
          checkCampaignVal(sm.signals[0], 1, 'x', 'y', 'z', 'w0');
          sm.clear();

          chai.expect(sh.setCampaignSignal('x', 'y', 'z', 'w100', 100)).to.be.equal(true);
          chai.expect(sm.signals.length).to.be.equal(0);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(1);
          checkCampaignVal(sm.signals[0], 100, 'x', 'y', 'z', 'w100');
          sm.clear();

          chai.expect(sh.setCampaignSignal('x', 'y', 'z', 'w500', 500)).to.be.equal(true);
          chai.expect(sm.signals.length).to.be.equal(0);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(1);
          checkCampaignVal(sm.signals[0], 500, 'x', 'y', 'z', 'w500');
        });

        it('add action signal works', function () {
          let sh = new SignalHandler({}, sm);
          chai.expect(sh.setActionSignal('x', 'y')).to.be.equal(true);
          chai.expect(sm.signals.length).to.be.equal(0);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(1);
        });

        it('add action signal with different counters works', function () {
          let sh = new SignalHandler({}, sm);
          chai.expect(sh.setActionSignal('x', 'y')).to.be.equal(true);
          chai.expect(sm.signals.length).to.be.equal(0);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(1);
          checkActionVal(sm.signals[0], 1, 'x', 'y');
          sm.clear();

          chai.expect(sh.setActionSignal('x', 'y2', 100)).to.be.equal(true);
          chai.expect(sm.signals.length).to.be.equal(0);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(1);
          checkActionVal(sm.signals[0], 100, 'x', 'y2');

        });

        it('signal are properly sent when modified', function () {
          let sh = new SignalHandler({}, sm);
          chai.expect(sh.setCampaignSignal('x', 'y', 'z', 'w')).to.be.equal(true);
          chai.expect(sm.signals.length).to.be.equal(0);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(1);
          // modify and check if we can sent it again
          chai.expect(sh.setCampaignSignal('x', 'y', 'z', 'w')).to.be.equal(true);
          chai.expect(sm.signals.length).to.be.equal(1);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(2);
          sm.clear();

          // test action
          chai.expect(sh.setActionSignal('x', 'y')).to.be.equal(true);
          chai.expect(sm.signals.length).to.be.equal(0);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(1);
          chai.expect(sh.setActionSignal('x', 'y')).to.be.equal(true);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(2);

        });

        it('signal are not sent if not modified', function () {
          let sh = new SignalHandler({}, sm);
          chai.expect(sh.setCampaignSignal('x', 'y', 'z', 'w')).to.be.equal(true);
          chai.expect(sm.signals.length).to.be.equal(0);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(1);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(1);

          // action signal
          sm.clear();
          chai.expect(sh.setActionSignal('x', 'y')).to.be.equal(true);
          chai.expect(sm.signals.length).to.be.equal(0);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(1);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(1);
          chai.expect(sh.setActionSignal('x', 'y')).to.be.equal(true);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(2);
        });

        it('proper format is sent for simple campaign signal', function () {
          let sh = new SignalHandler({}, sm);
          chai.expect(sh.setCampaignSignal('x', 'y', 'z', 'w')).to.be.equal(true);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(1);
          checkCampaignVal(sm.signals[0], 1, 'x', 'y', 'z', 'w');
          sm.clear();

          chai.expect(sh.setCampaignSignal('x', 'y', 'z', 'w')).to.be.equal(true);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(1);
          checkCampaignVal(sm.signals[0], 2, 'x', 'y', 'z', 'w');
          sm.clear();
        });

        it('signals are persistent', function () {
          const db = {};
          let sh = new SignalHandler(db, sm);
          chai.expect(sh.setCampaignSignal('x', 'y', 'z', 'w')).to.be.equal(true);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(1);
          checkCampaignVal(sm.signals[0], 1, 'x', 'y', 'z', 'w');
          sm.clear();
          return sh.savePersistenceData().then(() => {
            // create it again and wait for the load
            sh = new SignalHandler(db, sm);
            return sh._loadPersistenceData().then(() => {
              sh._sendSignalsToBE();
              chai.expect(sm.signals.length, 'signals length is 0?').to.be.equal(0);
              // add it again
              chai.expect(sh.setCampaignSignal('x', 'y', 'z', 'w')).to.be.equal(true);
              sh._sendSignalsToBE();
              chai.expect(sm.signals.length).to.be.equal(1);
              checkCampaignVal(sm.signals[0], 2, 'x', 'y', 'z', 'w');
            });
          });
        });

        it('signals are sent if werent after loading', function () {
          const db = {};
          let sh = new SignalHandler(db, sm);
          chai.expect(sh.setCampaignSignal('x', 'y', 'z', 'w')).to.be.equal(true);
          chai.expect(sm.signals.length).to.be.equal(0);
          return sh.savePersistenceData().then(() => {
            // create it again and wait for the load
            sh = new SignalHandler(db, sm);
            return sh._loadPersistenceData().then(() => {
              chai.expect(sm.signals.length).to.be.equal(0);
              sh._sendSignalsToBE();
              chai.expect(sm.signals.length).to.be.equal(1);
              checkCampaignVal(sm.signals[0], 1, 'x', 'y', 'z', 'w');
            });
          });
        });

        it('signals are not sent twice after loading', function () {
          const db = {};
          let sh = new SignalHandler(db, sm);
          chai.expect(sh.setCampaignSignal('x', 'y', 'z', 'w')).to.be.equal(true);
          return sh.savePersistenceData().then(() => {
            sh._sendSignalsToBE();
            chai.expect(sm.signals.length).to.be.equal(1);
            sm.clear();
            return sh.savePersistenceData().then(() => {
              // create it again and wait for the load
              let sh2 = new SignalHandler(db, sm);
              return sh2._loadPersistenceData().then(() => {
                chai.expect(sm.signals.length).to.be.equal(0);
                sh2._sendSignalsToBE();
                // should be 0 since we didn't modify the flag at all.
                chai.expect(sm.signals.length).to.be.equal(0);
                chai.expect(sh2.setCampaignSignal('x', 'y', 'z', 'w')).to.be.equal(true);
                sh2._sendSignalsToBE();
                chai.expect(sm.signals.length).to.be.equal(1);
                checkCampaignVal(sm.signals[0], 2, 'x', 'y', 'z', 'w');
              });
            });
          });
        });

        it('seq number is properly sent', function () {
          const db = {};
          let sh = new SignalHandler(db, sm);
          let expectedSeq = 0;
          chai.expect(sh.setCampaignSignal('x', 'y', 'z', 'w')).to.be.equal(true);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(1);
          checkCampaignSeq(sm.signals[0], expectedSeq, 'x');
          sm.clear();

          const counter=  10;
          for (let i = 0; i < counter; i += 1) {
            chai.expect(sh.setCampaignSignal('x', 'y', 'z', 'w')).to.be.equal(true);
          }
          expectedSeq += 1;
          sh._sendSignalsToBE();

          chai.expect(sm.signals.length).to.be.equal(1);
          checkCampaignSeq(sm.signals[0], expectedSeq, 'x');
          sm.clear();

          for (let i = 0; i < counter; i += 1) {
            chai.expect(sh.setCampaignSignal('x', 'y', 'z', 'w')).to.be.equal(true);
            expectedSeq += 1;
            sh._sendSignalsToBE();
          }
          checkCampaignSeq(sm.signals[sm.signals.length-1], expectedSeq, 'x');
        });

        it('seq number is properly stored (persistence)', function () {
          const db = {};
          let sh = new SignalHandler(db, sm);
          let expectedSeq = 0;
          chai.expect(sh.setCampaignSignal('x', 'y', 'z', 'w')).to.be.equal(true);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(1);
          checkCampaignSeq(sm.signals[0], expectedSeq, 'x');
          sm.clear();

          return sh.savePersistenceData().then(() => {
            // create it again and wait for the load
            sh = new SignalHandler(db, sm);
            return sh._loadPersistenceData().then(() => {
              chai.expect(sh.setCampaignSignal('x', 'y', 'z', 'w')).to.be.equal(true);
              sh._sendSignalsToBE();
              chai.expect(sm.signals.length).to.be.equal(1);
              expectedSeq += 1;
              checkCampaignSeq(sm.signals[0], expectedSeq, 'x');

            });
          });
        });

        it('seq number is properly stored (after sent and save)', function () {
          const db = {};
          let sh = new SignalHandler(db, sm);
          let expectedSeq = 0;
          chai.expect(sh.setCampaignSignal('x', 'y', 'z', 'w')).to.be.equal(true);
          return sh.savePersistenceData().then(() => {
            sh._sendSignalsToBE();
            chai.expect(sm.signals.length).to.be.equal(1);
            checkCampaignSeq(sm.signals[0], expectedSeq, 'x');
            sm.clear();
            return sh.savePersistenceData().then(() => {
              // create it again and wait for the load
              let sh2 = new SignalHandler(db, sm);
              return sh2._loadPersistenceData().then(() => {
                chai.expect(sm.signals.length).to.be.equal(0);
                sh2._sendSignalsToBE();
                // should be 0 since we didn't modify the flag at all.
                chai.expect(sm.signals.length).to.be.equal(0);
                chai.expect(sh2.setCampaignSignal('x', 'y', 'z', 'w')).to.be.equal(true);
                expectedSeq += 1;
                sh2._sendSignalsToBE();
                chai.expect(sm.signals.length).to.be.equal(1);
                checkCampaignSeq(sm.signals[0], expectedSeq, 'x');
              });
            });
          });
        });

        it('multiple campaigns signals are sent separately', function () {
          let sh = new SignalHandler({}, sm);
          chai.expect(sh.setCampaignSignal('x', 'y', 'z', 'w')).to.be.equal(true);
          chai.expect(sh.setCampaignSignal('x2', 'y2', 'z2', 'w2')).to.be.equal(true);
          chai.expect(sh.setCampaignSignal('x3', 'y3', 'z3', 'w3')).to.be.equal(true);
          chai.expect(sm.signals.length).to.be.equal(0);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(3);
          const sigIds = new Set();
          sm.signals.forEach((s) => {
            sigIds.add(getCampaignIDFromSig(s));
          });
          chai.expect(sigIds.has('x')).to.be.equal(true);
          chai.expect(sigIds.has('x2')).to.be.equal(true);
          chai.expect(sigIds.has('x3')).to.be.equal(true);
        });

        it('multiple campaigns signals have unique ucid', function () {
          let sh = new SignalHandler({}, sm);
          const totSigs = 100;
          for (let i = 0; i < totSigs; i += 1) {
            const cid = `cid_${i}`;
            const oid = `oid_${i}`;
            const orig = `orig_${i}`;
            const sid = `sid_${i}`;
            chai.expect(sh.setCampaignSignal(cid, oid, orig, sid)).to.be.equal(true);
          }
          chai.expect(sm.signals.length).to.be.equal(0);
          sh._sendSignalsToBE();
          chai.expect(sm.signals.length).to.be.equal(totSigs);
          const sigIds = new Set();
          sm.signals.forEach((s) => {
            sigIds.add(getCampaignUCIDFromSig(s));
          });
          chai.expect(sigIds.size).to.be.equal(totSigs);
        });


        // check action signals are sent
        //
        // check signals dirtiness, they should be sent multiple times but also
        // should not be sent twice
        //
        // check seq number is properly implemented, also is persistence
        //
        // check signals are not sent twice (the sync is persistent)
        //
        // check the structure of the signals are proper. Sending different arguments
        // (campaigns, signals, origins, etc).
        //
        // check for campaign different signals properly keep the format (cuid and more)
        //
        // check old signals are being removed
      });

      context('retry sending signals', function () {
        let sm;
        beforeEach(function () {
          sm = new SenderMock();
          sm.makeSentFail(true);
          sm.makeAsync(true);
        });

        it('retry sending a signal no more than 3 times', function () {
          let sh = new SignalHandler({}, sm);
          sh.setCampaignSignal('x', 'y', 'z', 'w');
          sh._sendSignalsToBE();
          return asyncInvoke(() => {
            chai.expect(sm.errSignals.length).eql(1);
            checkCampaignVal(sm.errSignals[0], 1, 'x', 'y', 'z', 'w');

            sh._sendSignalsToBE();
          }, 20).then(() => {
            return asyncInvoke(() => {
              chai.expect(sm.errSignals.length).eql(2);
              checkCampaignVal(sm.errSignals[1], 1, 'x', 'y', 'z', 'w');

              sh._sendSignalsToBE();
            }, 20).then(() => {
              return asyncInvoke(() => {
                chai.expect(sm.errSignals.length).eql(3);
                checkCampaignVal(sm.errSignals[2], 1, 'x', 'y', 'z', 'w');

                sh._sendSignalsToBE();
              }, 20).then(() => {
                return asyncInvoke(() => {
                  chai.expect(sm.errSignals.length).eql(3);
                  chai.expect(sm.signals.length).eql(0);
                }, 20);
              });
            });
          });
        });


        it('2 failed attempts followed by 1 success attempt. Then nothing will be sent', function () {
          let sh = new SignalHandler({}, sm);
          sh.setCampaignSignal('x', 'y', 'z', 'w');
          sh._sendSignalsToBE();

          return asyncInvoke(() => {
            chai.expect(sm.errSignals.length).eql(1);
            checkCampaignVal(sm.errSignals[0], 1, 'x', 'y', 'z', 'w');

            sh._sendSignalsToBE();
          }, 20).then(() => {
            return asyncInvoke(() => {
              chai.expect(sm.errSignals.length).eql(2);
              checkCampaignVal(sm.errSignals[1], 1, 'x', 'y', 'z', 'w');

              sm.makeSentFail(false);
              sh._sendSignalsToBE();
            }, 20).then(() => {
              return asyncInvoke(() => {
                chai.expect(sm.errSignals.length).eql(2);
                chai.expect(sm.signals.length).eql(1);
                checkCampaignVal(sm.signals[0], 1, 'x', 'y', 'z', 'w');
              }, 20).then(() => {
                return asyncInvoke(() => {
                  chai.expect(sm.errSignals.length).eql(2);
                  chai.expect(sm.signals.length).eql(1);
                }, 20);
              });
            });
          });
        });

        it('2 signals - retry sending each signal no more than 3 times', function () {
          let sh = new SignalHandler({}, sm);
          sh.setCampaignSignal('x', 'y', 'z', 'w');
          sh.setCampaignSignal('x2', 'y2', 'z2', 'w2');
          sh._sendSignalsToBE();
          return asyncInvoke(() => {
            chai.expect(sm.errSignals.length).eql(2);
            checkCampaignVal(sm.errSignals[0], 1, 'x', 'y', 'z', 'w');
            checkCampaignVal(sm.errSignals[1], 1, 'x2', 'y2', 'z2', 'w2');

            sh._sendSignalsToBE();
          }, 20).then(() => {
            return asyncInvoke(() => {
              chai.expect(sm.errSignals.length).eql(4);
              checkCampaignVal(sm.errSignals[2], 1, 'x', 'y', 'z', 'w');
              checkCampaignVal(sm.errSignals[3], 1, 'x2', 'y2', 'z2', 'w2');

              sh._sendSignalsToBE();
            }, 20).then(() => {
              return asyncInvoke(() => {
                chai.expect(sm.errSignals.length).eql(6);
                checkCampaignVal(sm.errSignals[4], 1, 'x', 'y', 'z', 'w');
                checkCampaignVal(sm.errSignals[5], 1, 'x2', 'y2', 'z2', 'w2');

                sh._sendSignalsToBE();
              }, 20).then(() => {
                return asyncInvoke(() => {
                  chai.expect(sm.errSignals.length).eql(6);
                  chai.expect(sm.signals.length).eql(0);
                }, 20);
              });
            });
          });
        });


        it('fail, close, save , load, sending success, sending nothing', function () {
          const db = {};
          let sh = new SignalHandler(db, sm);
          sh.setCampaignSignal('x', 'y', 'z', 'w');
          sh._sendSignalsToBE();

          return asyncInvoke(() => {
            chai.expect(sm.errSignals.length).eql(1);
            checkCampaignVal(sm.errSignals[0], 1, 'x', 'y', 'z', 'w');
            // sm.clear();
          }, 20).then(() => {
            return sh.savePersistenceData().then(() => {
              sh = new SignalHandler(db, sm);
              return sh._loadPersistenceData().then(() => {
                sm.makeSentFail(false);
                sh._sendSignalsToBE();
              }).then(() => {
                return asyncInvoke(() => {
                  chai.expect(sm.errSignals.length).eql(1);
                  chai.expect(sm.signals.length).eql(1);
                }, 20);
              }).then(() => {
                return asyncInvoke(() => {
                  chai.expect(sm.errSignals.length).eql(1);
                  chai.expect(sm.signals.length).eql(1);
                }, 20);
              });
            });
          });
        });

        it('3 failed attempts, modify, failed attempts, send success', function () {
          let sh = new SignalHandler({}, sm);
          sh.setCampaignSignal('x', 'y', 'z', 'w');
          sh._sendSignalsToBE();
          return asyncInvoke(() => {
            chai.expect(sm.errSignals.length).eql(1);
            checkCampaignVal(sm.errSignals[0], 1, 'x', 'y', 'z', 'w');

            sh._sendSignalsToBE();
          }, 20).then(() => {
            return asyncInvoke(() => {
              chai.expect(sm.errSignals.length).eql(2);
              checkCampaignVal(sm.errSignals[1], 1, 'x', 'y', 'z', 'w');

              sh._sendSignalsToBE();
            }, 20).then(() => {
              return asyncInvoke(() => {
                chai.expect(sm.errSignals.length).eql(3);
                checkCampaignVal(sm.errSignals[2], 1, 'x', 'y', 'z', 'w');
                sh.setActionSignal('click', 'yy');
                sm.makeSentFail(false);

                sh._sendSignalsToBE();
              }, 20).then(() => {
                return asyncInvoke(() => {
                  chai.expect(sm.errSignals.length).eql(3);
                  chai.expect(sm.signals.length).eql(1);
                  checkActionVal(sm.signals[0], 1, 'click', 'yy');
                }, 20);
              });
            });
          });
        });
      });
    });
  }
);
