import FSBuilder from 'tests/core/unit/utils/fs';

/* global chai */
/* global describeModule */

const expect = chai.expect;
const crypto = System._nodeRequire('crypto');
const _fs = FSBuilder(System._nodeRequire('path'));

export default describeModule('core/incremental-storage',
  () => ({
    'core/utils': {
      default: {
        log: () => {},
        setTimeout,
        clearTimeout,
      },
    },
    'core/helpers/md5': {
      default: data => crypto.createHash('md5').update(data).digest('hex'),
    },
    'core/fs': _fs,
    'core/console': console,
  }),
  () => {
    describe('IncrementalStorageTest', function () {
      this.timeout(5000);
      let IncrementalStorage;
      beforeEach(function () {
        IncrementalStorage = this.module().default;
      });

      function processFunction(event, obj) {
        obj.value = obj.value || 0;
        if (event.type === 'add') {
          obj.value += event.value;
        } else if (event.type === 'multiply') {
          obj.value *= event.value;
        } else if (event.type === 'divide') {
          obj.value /= event.value;
        } else if (event.type === 'subtract') {
          obj.value -= event.value;
        }
        if (obj.value === -Infinity || obj.value === Infinity || isNaN(obj.value)) {
          obj.value = 0;
        }
      }

      var seed = 7;
      function random(max, min) {
        max = max || 1;
        min = min || 0;
        seed = ((seed * 9301) + 49297) % 233280;
        var rnd = seed / 233280;
        return min + (rnd * (max - min));
      }

      it('IncrementalStorage - simple', function () {
        var dbname = 'test' + Math.round(Math.random() * 1000000000);
        var dirName = 'StorageTests';
        var exactName = false;
        var immediateSnap = false;
        var storage = new IncrementalStorage();

        return storage.open(dbname, processFunction, dirName, exactName, immediateSnap)
          .then(() => {
            storage.processEvent({ type: 'add', value: 5 });
            storage.processEvent({ type: 'add', value: 6 });
            storage.processEvent({ type: 'add', value: 7 });
            storage.processEvent({ type: 'add', value: 8 });
            storage.processEvent({ type: 'multiply', value: 3 });
            storage.processEvent({ type: 'divide', value: 2 });
            storage.processEvent({ type: 'subtract', value: 2 });
            expect(storage.obj.value).to.equal(37);
            return storage.close();
          })
          .then(() => {
            storage = new IncrementalStorage();
            return storage.open(dbname, processFunction, dirName, exactName, immediateSnap);
          })
          .then(() => {
            storage.processEvent({ type: 'add', value: 5 });
            storage.processEvent({ type: 'multiply', value: 3 });
            expect(storage.obj.value).to.equal(126);
            return storage.close();
          })
          .then(() => {
            storage = new IncrementalStorage();
            return storage.open(dbname, processFunction, dirName, exactName, immediateSnap);
          })
          .then(() => {
            expect(storage.obj.value).to.equal(126);
            return storage.close();
          });
      });

      it('IncrementalStorage - snapshot', function () {
        var dbname = 'test' + Math.round(Math.random() * 1000000000);
        var dirName = 'StorageTests';
        var exactName = true;
        var immediateSnap = false;
        var storage = new IncrementalStorage();

        return storage.open(dbname, processFunction, dirName, exactName, immediateSnap)
          .then(() => {
            storage.processEvent({ type: 'add', value: 5 });
            storage.processEvent({ type: 'add', value: 6 });
            storage.processEvent({ type: 'add', value: 7 });
            storage.processEvent({ type: 'add', value: 8 });
            storage.processEvent({ type: 'multiply', value: 3 });
            storage.processEvent({ type: 'divide', value: 2 });
            storage.processEvent({ type: 'subtract', value: 2 });
            expect(storage.obj.value).to.equal(37);
            storage.snapshot();
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                _fs.readFile(storage.getJournalFile(), { isText: true })
                  .then(s => {
                    if (s === '') {
                      resolve();
                    } else {
                      reject('Snapshot not correct');
                    }
                  });
              }, 2000);
            });
          })
          .then(() => storage.close())
          .then(() => {
            storage = new IncrementalStorage();
            return storage.open(dbname, processFunction, dirName, exactName, immediateSnap);
          })
          .then(() => {
            expect(storage.obj.value).to.equal(37);
            return storage.close();
          });
      });

      it('IncrementalStorage - auto snapshot', function () {
        var dbname = 'test' + Math.round(Math.random() * 1000000000);
        var dirName = 'StorageTests';
        var exactName = true;
        var immediateSnap = true;
        var storage = new IncrementalStorage();

        return storage.open(dbname, processFunction, dirName, exactName, immediateSnap)
          .then(() => {
            storage.processEvent({ type: 'add', value: 5 });
            storage.processEvent({ type: 'add', value: 6 });
            storage.processEvent({ type: 'add', value: 7 });
            storage.processEvent({ type: 'add', value: 8 });
            storage.processEvent({ type: 'multiply', value: 3 });
            storage.processEvent({ type: 'divide', value: 2 });
            storage.processEvent({ type: 'subtract', value: 2 });
            expect(storage.obj.value).to.equal(37);
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                _fs.readFile(storage.getJournalFile(), { isText: true })
                  .then(s => {
                    if (s === '') {
                      resolve();
                    } else {
                      reject('Snapshot not correct');
                    }
                  });
              }, 2000);
            });
          })
          .then(() => storage.close())
          .then(() => {
            storage = new IncrementalStorage();
            return storage.open(dbname, processFunction, dirName, exactName, immediateSnap);
          })
          .then(() => {
            expect(storage.obj.value).to.equal(37);
            return storage.close();
          });
      });

      it('IncrementalStorage - big test', function () {
        var dbname = 'test' + Math.round(Math.random() * 1000000000);
        var dirName = 'StorageTests';
        var exactName = true;
        var immediateSnap = false;
        var storage = new IncrementalStorage();
        var N = 5000;
        var operations = ['add', 'subtract', 'multiply', 'divide'];
        var obj = {};

        return storage.open(dbname, processFunction, dirName, exactName, immediateSnap)
          .then(() => {
            while (N--) {
              var op = operations[Math.floor(random() * 4)];
              var event = { type: op, value: Math.floor(1 + (random() * 10)) };
              processFunction(event, obj);
              storage.processEvent(event);
              expect(storage.obj.value).to.equal(obj.value);
            }
          })
          .then(() => storage.close())
          .then(() => {
            storage = new IncrementalStorage();
            return storage.open(dbname, processFunction, dirName, exactName, immediateSnap);
          })
          .then(() => {
            expect(storage.obj.value).to.equal(obj.value);
            return storage.close();
          })
          .then(() => {
            storage = new IncrementalStorage();
            return storage.open(dbname, processFunction, dirName, exactName, true);
          })
          .then(() => {
            storage.snapshot();
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                resolve();
              }, 2000);
            });
          })
          .then(() => {
            return _fs.readFile(storage.getJournalFile(), { isText: true })
              .then(s => {
                if (s !== '') {
                  return Promise.reject('Snapshot not correct: journal not empty');
                }
              });
          })
          .then(() => {
            N = 5000;
            while (N--) {
              var op = operations[Math.floor(random() * 4)];
              var event = { type: op, value: Math.floor(1 + (random() * 10)) };
              processFunction(event, obj);
              storage.processEvent(event);
              expect(storage.obj.value).to.equal(obj.value);
            }
          })
          .then(() => storage.close())
          .then(() => {
            storage = new IncrementalStorage();
            return storage.open(dbname, processFunction, dirName, exactName, true);
          })
          .then(() => {
            expect(storage.obj.value).to.equal(obj.value);
            return storage.close();
          });
      });
    });
  }
);
