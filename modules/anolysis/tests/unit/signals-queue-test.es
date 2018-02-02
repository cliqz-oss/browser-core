/* global chai */
/* global describeModule */
/* global sinon */

const Dexie = require('dexie');
const IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');
const indexedDB = require('fake-indexeddb');
const moment = require('moment');

let sendSignal = () => {};

const CURRENT_DATE = '2017-01-01';
const DATE_FORMAT = 'YYYY-MM-DD';
function getCurrentDate() {
  return moment(CURRENT_DATE, DATE_FORMAT);
}

function initDexie(name) {
  return new Dexie(name, {
    indexedDB,
    IDBKeyRange,
  });
}

export default describeModule('anolysis/signals-queue',
  () => ({
    'platform/lib/dexie': {
      default: () => Promise.resolve(initDexie),
    },
    'core/cliqz': {
      utils: {
        setInterval() {},
        setTimeout(cb) { cb(); },
      },
    },
    'core/console': { default: {} },
    'core/database': {
      default: class Database { destroy() { return Promise.resolve(); } }
    },
    'anolysis/logger': {
      default: {
        debug() {},
        log() {},
        error() {},
      },
    },
    'anolysis/synchronized-date': {
      default() {
        return getCurrentDate();
      },
    },
    'anolysis/backend-communication': {
      default: {
        sendSignal(signal) {
          return sendSignal(signal);
        },
      },
    },
  }),
  () => {
    describe('#SignalQueue', () => {
      let queue;
      let storage;

      beforeEach(function initDatabase() {
        return this.system.import('anolysis/storage')
          .then((module) => {
            const Storage = module.default;
            storage = new Storage();
            return storage.init();
          })
          .then(() => {
            const SignalQueue = this.module().default;
            queue = new SignalQueue();
            return queue.init(storage.signals);
          });
      });

      afterEach(() => storage.destroy());

      it('pushes new messages in the queue', () =>
        queue.push({ signal: 1 })
          .then(() => queue.push({ signal: 2 }))
          .then(() => storage.signals.getAll())
          .then(signals => chai.expect(signals).to.have.length(2))
      );

      it('process batch of size 1', () => {
        sendSignal = sinon.spy(() => Promise.resolve({ ok: true }));

        return queue.push({ signal: 1 })
          .then(() => queue.push({ signal: 2 }))
          .then(() => { queue.initialized = true; })
          .then(() => queue.processNextBatch(1))
          .then(() => chai.expect(sendSignal).to.have.been.calledOnce)
          .then(() => storage.signals.getAll())
          .then(signals => chai.expect(signals).to.have.length(1));
      });

      it('process batch of size 2', () => {
        sendSignal = sinon.spy(() => Promise.resolve({ ok: true }));

        return queue.push({ signal: 1 })
          .then(() => queue.push({ signal: 2 }))
          .then(() => { queue.initialized = true; })
          .then(() => queue.processNextBatch(2))
          .then(() => chai.expect(sendSignal).to.have.been.calledTwice)
          .then(() => storage.signals.getAll())
          .then(signals => chai.expect(signals).to.have.length(0));
      });

      it('does not delete signal when sendSignal fails', () => {
        sendSignal = sinon.spy(() => Promise.reject());

        return queue.push({ signal: 1 })
          .then(() => queue.push({ signal: 2 }))
          .then(() => { queue.initialized = true; })
          .then(() => chai.expect(queue.processNextBatch(2)).to.be.rejected)
          .then(() => chai.expect(sendSignal).to.have.been.calledOnce)
          .then(() => storage.signals.getAll())
          .then(signals => chai.expect(signals).to.have.length(2));
      });

      it('sends signals even when storage fails', () => {
        const sentSignals = [];
        storage.signals.push = sinon.spy(() => Promise.reject('Could not persist signal'));
        sendSignal = sinon.spy((signal) => {
          sentSignals.push(signal);
          return Promise.resolve();
        });

        queue.initialized = true;
        return queue.push({ behavior: 1, meta: { date: 'now' } })
          .then(() => queue.push({ behavior: 2, meta: { date: 'a bit after now' } }))
          .then(() => queue.processNextBatch(2))
          .then(() => storage.signals.getAll())
          .then(signals => chai.expect(signals).to.have.length(0))
          .then(() => chai.expect(sendSignal).to.have.been.calledTwice)
          .then(() => chai.expect(sentSignals).to.have.length(2))
          .then(() => chai.expect(sentSignals[0]).to.have.nested.include({ 'meta.forcePushed': true }))
          .then(() => chai.expect(sentSignals[1]).to.have.nested.include({ 'meta.forcePushed': true }));
      });
    });
  },
);
