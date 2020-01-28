/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */
/* global describeModule */
/* global sinon */

const mocks = require('../mocks');

let sendSignal = () => {};

export default describeModule('anolysis/internals/signals-queue',
  () => ({
    ...mocks,
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

      const makeSignal = signal => ({
        meta: {
          date: '2017-01-01',
        },
        ...signal,
      });

      beforeEach(async function () {
        const Storage = (await this.system.import('anolysis/internals/storage/memory')).default;
        storage = new Storage();
        await storage.init();

        const SignalQueue = this.module().default;
        queue = new SignalQueue({
          queue: {
            batchSize: 5,
            sendInterval: 15000,
            maxAttempts: 5,
          }
        });

        await queue.init(storage.signals);
      });

      afterEach(() => storage.destroy());

      it('pushes new messages in the queue', () =>
        queue.push(makeSignal({ signal: 1 }))
          .then(() => queue.push(makeSignal({ signal: 2 })))
          .then(() => storage.signals.getAll())
          .then(signals => chai.expect(signals).to.have.length(2)));

      it('process batch of size 1', () => {
        sendSignal = sinon.spy(() => Promise.resolve({ ok: true }));

        return queue.push(makeSignal({ signal: 1 }))
          .then(() => queue.push(makeSignal({ signal: 2 })))
          .then(() => { queue.initialized = true; })
          .then(() => queue.processNextBatch(1))
          .then(() => chai.expect(sendSignal).to.have.been.calledOnce)
          .then(() => storage.signals.getAll())
          .then(signals => chai.expect(signals).to.have.length(1));
      });

      it('process batch of size 2', () => {
        sendSignal = sinon.spy(() => Promise.resolve({ ok: true }));

        return queue.push(makeSignal({ signal: 1 }))
          .then(() => queue.push(makeSignal({ signal: 2 })))
          .then(() => { queue.initialized = true; })
          .then(() => queue.processNextBatch(2))
          .then(() => chai.expect(sendSignal).to.have.been.calledTwice)
          .then(() => storage.signals.getAll())
          .then(signals => chai.expect(signals).to.have.length(0));
      });

      it('does not delete signal when sendSignal fails', () => {
        sendSignal = sinon.spy(() => Promise.reject());

        return queue.push(makeSignal({ signal: 1 }))
          .then(() => queue.push(makeSignal({ signal: 2 })))
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
          sentSignals.push(makeSignal(signal));
          return Promise.resolve();
        });

        queue.initialized = true;
        return queue.push(makeSignal({ behavior: 1, meta: { date: 'now' } }))
          .then(() => queue.push(makeSignal({ behavior: 2, meta: { date: 'a bit after now' } })))
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
