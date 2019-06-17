/* global chai */
/* global describeModule */
/* global sinon */

const moment = require('moment');
const mockDexie = require('../../../core/unit/utils/dexie');

let sendSignal = () => {};

const CURRENT_DATE = '2017-01-01';
const DATE_FORMAT = 'YYYY-MM-DD';
function getCurrentDate() {
  return moment(CURRENT_DATE, DATE_FORMAT);
}

export default describeModule('anolysis/internals/signals-queue',
  () => ({
    ...mockDexie,
    'core/console': {
      isLoggingEnabled() { return false; },
      default: {},
    },
    'core/services/pacemaker': {
      default: {
        register() {},
        setTimeout() {},
        clearTimeout() {},
      },
    },
    'anolysis/internals/logger': {
      default: {
        // debug(...args) { console.log('DEBUG', ...args); },
        // log(...args) { console.log('LOG', ...args); },
        // error(...args) { console.log('ERROR', ...args); },
        debug() {},
        log() {},
        error() {},
      },
    },
    'anolysis/internals/synchronized-date': {
      default() {
        return getCurrentDate();
      },
    },
    'anolysis/internals/backend-communication': {
      default: class Backend {
        sendSignal(signal) {
          return sendSignal(signal);
        }
      },
    },
  }),
  () => {
    describe('#SignalQueue', () => {
      let queue;
      let storage;

      beforeEach(function () {
        return this.system.import('anolysis/internals/storage/dexie')
          .then((module) => {
            const Storage = module.default;
            storage = new Storage();
            return storage.init();
          })
          .then(() => {
            const SignalQueue = this.module().default;

            const config = new Map();
            config.set('signalQueue.batchSize', 5);
            config.set('signalQueue.sendInterval', 15000);
            config.set('signalQueue.maxAttempts', 5);
            queue = new SignalQueue(config);
            return queue.init(storage.signals);
          });
      });

      afterEach(() => storage.destroy());

      it('pushes new messages in the queue', () =>
        queue.push({ signal: 1 })
          .then(() => queue.push({ signal: 2 }))
          .then(() => storage.signals.getAll())
          .then(signals => chai.expect(signals).to.have.length(2)));

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
        storage.signals.push = sinon.spy(() => Promise.reject(new Error('Could not persist signal')));
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
  });
