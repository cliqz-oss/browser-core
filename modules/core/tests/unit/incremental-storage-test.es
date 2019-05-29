/* global chai */
/* global describeModule */

/* eslint no-param-reassign: off */

const expect = chai.expect;
const crypto = require('crypto');
const _path = require('path');
const FSBuilder = require('./utils/fs');

const _fs = FSBuilder(_path);

export default describeModule('core/incremental-storage',
  () => ({
    'core/utils': {
      default: {
        log: () => {},
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

      let seed = 7;
      function random(max, min) {
        max = max || 1;
        min = min || 0;
        seed = ((seed * 9301) + 49297) % 233280;
        const rnd = seed / 233280;
        return min + (rnd * (max - min));
      }

      it('IncrementalStorage - simple', function () {
        const dbname = `test${Math.round(Math.random() * 1000000000)}`;
        const dirName = 'StorageTests';
        const exactName = false;
        const immediateSnap = false;
        let storage = new IncrementalStorage();

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
            return storage.flush().then(() => storage.close());
          })
          .then(() => {
            storage = new IncrementalStorage();
            return storage.open(dbname, processFunction, dirName, exactName, immediateSnap);
          })
          .then(() => {
            storage.processEvent({ type: 'add', value: 5 });
            storage.processEvent({ type: 'multiply', value: 3 });
            expect(storage.obj.value).to.equal(126);
            return storage.flush().then(() => storage.close());
          })
          .then(() => {
            storage = new IncrementalStorage();
            return storage.open(dbname, processFunction, dirName, exactName, immediateSnap);
          })
          .then(() => {
            expect(storage.obj.value).to.equal(126);
            return storage.flush().then(() => storage.close());
          });
      });

      it('IncrementalStorage - snapshot', function () {
        const dbname = `test${Math.round(Math.random() * 1000000000)}`;
        const dirName = 'StorageTests';
        const exactName = true;
        const immediateSnap = false;
        let storage = new IncrementalStorage();

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
                  .then((s) => {
                    if (s === '') {
                      resolve();
                    } else {
                      reject(new Error('Snapshot not correct'));
                    }
                  });
              }, 2000);
            });
          })
          .then(() => storage.flush())
          .then(() => storage.close())
          .then(() => {
            storage = new IncrementalStorage();
            return storage.open(dbname, processFunction, dirName, exactName, immediateSnap);
          })
          .then(() => {
            expect(storage.obj.value).to.equal(37);
            return storage.flush().then(() => storage.close());
          });
      });

      it('IncrementalStorage - auto snapshot', function () {
        const dbname = `test${Math.round(Math.random() * 1000000000)}`;
        const dirName = 'StorageTests';
        const exactName = true;
        const immediateSnap = true;
        let storage = new IncrementalStorage();

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
                  .then((s) => {
                    if (s === '') {
                      resolve();
                    } else {
                      reject(new Error('Snapshot not correct'));
                    }
                  });
              }, 2000);
            });
          })
          .then(() => storage.flush())
          .then(() => storage.close())
          .then(() => {
            storage = new IncrementalStorage();
            return storage.open(dbname, processFunction, dirName, exactName, immediateSnap);
          })
          .then(() => {
            expect(storage.obj.value).to.equal(37);
            return storage.flush().then(() => storage.close());
          });
      });

      it('IncrementalStorage - big test', function () {
        const dbname = `test${Math.round(Math.random() * 1000000000)}`;
        const dirName = 'StorageTests';
        const exactName = true;
        const immediateSnap = false;
        let storage = new IncrementalStorage();
        let N = 5000;
        const operations = ['add', 'subtract', 'multiply', 'divide'];
        const obj = {};

        return storage.open(dbname, processFunction, dirName, exactName, immediateSnap)
          .then(() => {
            while (N !== 1) {
              N -= 1;
              const op = operations[Math.floor(random() * 4)];
              const event = { type: op, value: Math.floor(1 + (random() * 10)) };
              processFunction(event, obj);
              storage.processEvent(event);
              expect(storage.obj.value).to.equal(obj.value);
            }
          })
          .then(() => storage.flush())
          .then(() => storage.close())
          .then(() => {
            storage = new IncrementalStorage();
            return storage.open(dbname, processFunction, dirName, exactName, immediateSnap);
          })
          .then(() => {
            expect(storage.obj.value).to.equal(obj.value);
            return storage.flush().then(() => storage.close());
          })
          .then(() => {
            storage = new IncrementalStorage();
            return storage.open(dbname, processFunction, dirName, exactName, true);
          })
          .then(() => {
            storage.snapshot();
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve();
              }, 2000);
            });
          })
          .then(() =>
            _fs.readFile(storage.getJournalFile(), { isText: true })
              .then((s) => {
                if (s !== '') {
                  return Promise.reject(new Error('Snapshot not correct: journal not empty'));
                }
                return undefined;
              }))
          .then(() => {
            N = 5000;
            while (N !== 1) {
              N -= 1;
              const op = operations[Math.floor(random() * 4)];
              const event = { type: op, value: Math.floor(1 + (random() * 10)) };
              processFunction(event, obj);
              storage.processEvent(event);
              expect(storage.obj.value).to.equal(obj.value);
            }
          })
          .then(() => storage.flush())
          .then(() => storage.close())
          .then(() => {
            storage = new IncrementalStorage();
            return storage.open(dbname, processFunction, dirName, exactName, true);
          })
          .then(() => {
            expect(storage.obj.value).to.equal(obj.value);
            return storage.flush().then(() => storage.close());
          });
      });
    });
  });
