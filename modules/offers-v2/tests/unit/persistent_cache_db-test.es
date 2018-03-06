/* global chai */
/* global describeModule */
/* global require */

let mockedTS = Date.now();

function mockCurrentTS(ts) {
  mockedTS = ts;
}


export default describeModule('offers-v2/persistent_cache_db',
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
      isChromium: false,
    },
    'core/console': {
      default: {}
    },
    'core/prefs': {
      default: {}
    },
    'core/crypto/random': {
      random: function () {
        return Math.random();
      }
    },
    'core/cliqz': {
      utils: {
        setInterval: function() {},
        clearInterval: function() {}
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
    },
    'offers-v2/utils': {
      timestampMS: () => mockedTS,
      generateUUID: () => Math.random()
    }
  }),
  () => {
    describe('PersistentCacheDB', function() {
      let PersistentCacheDB;

      beforeEach(function () {
        PersistentCacheDB = this.module().default;
      });

      describe('#basic tests', function () {
        let pcache;
        let db;

        beforeEach(function () {
          db = {};
          pcache = new PersistentCacheDB(db, 'test');
        });

        context('set get data correct', function () {
          it('invalid id cannot be added', function () {
            chai.expect(pcache.setEntryData(null, {})).to.equal(false);
            chai.expect(pcache.setEntryData()).to.equal(false);
            chai.expect(pcache.setEntryData(undefined, {})).to.equal(false);
          });

          it('set entry data', function () {
            const obj = {a: 1, b: 1};
            chai.expect(pcache.setEntryData('eid1', obj)).to.equal(true);
            chai.expect(pcache.getEntryData('eid1')).eql(obj);
          });

          it('id matches', function () {
            const obj = {a: 1, b: 1};
            chai.expect(pcache.setEntryData('eid1', obj)).to.equal(true);
            chai.expect(pcache.getEntryContainer('eid2')).to.not.exist;
            chai.expect(pcache.getEntryData('eid2')).to.not.exist;
            chai.expect(pcache.getEntryData('eid11')).to.not.exist;
            chai.expect(pcache.getEntryData('eid1')).eql(obj);
          });

          it('container store proper data', function () {
            const obj = {a: 1, b: 1};
            chai.expect(pcache.setEntryData('eid1', obj)).to.equal(true);
            chai.expect(pcache.getEntryContainer('eid1')).to.exist;
            chai.expect(pcache.getEntryContainer('eid1').data).eql(obj);
          });

          it('container store multiple proper data', function () {
            const objs = [];
            for (let i = 0; i < 100; ++i) {
              objs.push({ a: i, a_1: i+1 });
              const key = `key_${i}`;
              chai.expect(pcache.getEntryData(key)).to.not.exist;
              chai.expect(pcache.setEntryData(key, objs[i])).to.equal(true);
            }
            for (let i = 0; i < 100; ++i) {
              const key = `key_${i}`;
              chai.expect(pcache.getEntryData(key)).eql(objs[i]);
            }
          });
        });

        context('save / load correct', function () {
          it('container store proper data', function () {
            const obj = {a: 1, b: 1};
            chai.expect(pcache.getEntryData('eid1')).to.not.exist;
            chai.expect(pcache.setEntryData('eid1', obj)).to.equal(true);
            return pcache.saveEntries(true).then((result) => {
              chai.expect(result).to.equal(true);
              chai.expect(pcache.getEntryData('eid1')).eql(obj);
              const pcache2 = new PersistentCacheDB(db, 'test');
              return pcache2.loadEntries(true).then((r) => {
                chai.expect(result).to.equal(true);
                chai.expect(pcache2.getEntryData('eid1')).eql(obj);
              });
            });
          });

          it('dirtyness work 1', function () {
            const obj = {a: 1, b: 1};
            chai.expect(pcache.getEntryData('eid1')).to.not.exist;
            chai.expect(pcache.setEntryData('eid1', obj)).to.equal(true);
            return pcache.saveEntries(true).then((result) => {
              chai.expect(result).to.equal(true);
              chai.expect(pcache.getEntryData('eid1')).eql(obj);
              const pcache2 = new PersistentCacheDB(db, 'test');
              return pcache2.loadEntries(true).then((r) => {
                chai.expect(result).to.equal(true);
                chai.expect(pcache2.getEntryData('eid1')).eql(obj);
                const d = pcache2.getEntryData('eid1');
                d.a = 3;
                return pcache2.saveEntries(true).then((result) => {
                  const pcache3 = new PersistentCacheDB(db, 'test');
                  return pcache3.loadEntries(true).then((r) => {
                    chai.expect(pcache3.getEntryData('eid1')).eql(obj);
                  });
                });
              });
            });
          });

          it('dirtyness work 2', function () {
            const obj = {a: 1, b: 1};
            chai.expect(pcache.getEntryData('eid1')).to.not.exist;
            chai.expect(pcache.setEntryData('eid1', obj)).to.equal(true);
            return pcache.saveEntries(true).then((result) => {
              chai.expect(result).to.equal(true);
              chai.expect(pcache.getEntryData('eid1')).eql(obj);
              const pcache2 = new PersistentCacheDB(db, 'test');
              return pcache2.loadEntries(true).then((r) => {
                chai.expect(result).to.equal(true);
                chai.expect(pcache2.getEntryData('eid1')).eql(obj);
                const d = pcache2.getEntryData('eid1');
                d.a = 3;
                pcache2.markEntryDirty('eid1');
                return pcache2.saveEntries(true).then((result) => {
                  const pcache3 = new PersistentCacheDB(db, 'test');
                  return pcache3.loadEntries(true).then((r) => {
                    chai.expect(pcache3.getEntryData('eid1').a).eql(3);
                  });
                });
              });
            });
          });

          it('dirtyness work 3', function () {
            const obj = {a: 1, b: 1};
            chai.expect(pcache.getEntryData('eid1')).to.not.exist;
            chai.expect(pcache.setEntryData('eid1', obj)).to.equal(true);
            return pcache.saveEntries(true).then((result) => {
              chai.expect(result).to.equal(true);
              chai.expect(pcache.getEntryData('eid1')).eql(obj);
              const pcache2 = new PersistentCacheDB(db, 'test');
              return pcache2.loadEntries(true).then((r) => {
                chai.expect(result).to.equal(true);
                chai.expect(pcache2.getEntryData('eid1')).eql(obj);
                const d = pcache2.getEntryData('eid1');
                d.a = 3;
                pcache2.setEntryData('eid1', d);
                return pcache2.saveEntries(true).then((result) => {
                  const pcache3 = new PersistentCacheDB(db, 'test');
                  return pcache3.loadEntries(true).then((r) => {
                    chai.expect(pcache3.getEntryData('eid1').a).eql(3);
                  });
                });
              });
            });
          });

        });

        context('remove old entries correct', function () {
          it('container store proper data', function () {
            pcache = new PersistentCacheDB(db, 'test', {old_entries_dt_secs: 10});
            mockCurrentTS(0);
            const objs = [];
            for (let i = 0; i < 100; ++i) {
              objs.push({ a: i, a_1: i+1 });
              const key = `key_${i}`;
              mockCurrentTS(i);
              chai.expect(pcache.getEntryData(key)).to.not.exist;
              chai.expect(pcache.setEntryData(key, objs[i])).to.equal(true);
            }

            // removing old entries should remove all that 101 - i >= 10 => 91
            mockCurrentTS(101);
            return pcache.saveEntries(true).then((result) => {
              chai.expect(result).to.equal(true);
              const pcache2 = new PersistentCacheDB(db, 'test', {old_entries_dt_secs: 10});
              return pcache2.loadEntries(true).then((r) => {
                for (let i = 0; i < 100; ++i) {
                  const key = `key_${i}`;
                  if ((mockedTS - i) >= 10) {
                    chai.expect(pcache2.getEntryContainer(key)).to.not.exist;
                  } else {
                    chai.expect(pcache2.getEntryData(key)).eql(objs[i]);
                  }
                }
              });
            });

          });
        });


      });
    })
  }
);
