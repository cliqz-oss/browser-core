/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */
/* global describeModule */

const expect = chai.expect;

function getRandomInt(min, max) {
  const imin = Math.ceil(min);
  const imax = Math.floor(max);
  return Math.floor(Math.random() * (imax - imin)) + imin;
}


export default describeModule('core/message-queue',
  () => ({
    'core/console': {
      default: {
        log: () => {},
        error: () => {},
        debug: () => {},
      },
    },
  }),
  () => {
    describe('MessageQueue', function () {
      this.timeout(10000);

      let MessageQueue;

      beforeEach(function () {
        MessageQueue = this.module().default;
      });

      it('should initially have size 0', function () {
        const queue = MessageQueue('test', () => Promise.resolve());
        expect(queue.getSize()).to.equal(0);
      });

      it('Resolve with 1 message', () => new Promise((resolve) => {
        const queue = MessageQueue('tests', () => resolve());
        return queue.push(42);
      }));

      it('Adding messages should increase the queue size', function () {
        const queue = MessageQueue('test', () => Promise.resolve());

        queue.push(() => {});
        const size1 = queue.getSize();

        queue.push(() => {});
        const size2 = queue.getSize();

        expect(size2).to.be.above(size1);
        expect(size1).to.be.most(2);
      });

      it('Resolve messages in order of insertion', () => new Promise((resolve, reject) => {
        const messages = [];
        const expectedResult = [];
        const promises = [];

        // Create a message queue where the callback will wait a random number
        // of milliseconds (between 0 and 50) before resolving. It resolves to
        // the value it received, and it chained to a `then` that will add this
        // value in the `messages` array. We expect the order of the messages
        // in the array to be independent from the time of the computation
        // performed by the callback.
        const queue = MessageQueue('tests', data => new Promise((res) => {
          const timeToWait = getRandomInt(0, 50);
          setTimeout(() => {
            res(data);
          }, timeToWait);
        }).then((result) => { messages.push(result); return result; }));

        // Push 100 messages in the queue and maintain an array with the
        // insertion order of the message, to be compared with the obtained
        // results from the callbacks.
        for (let i = 100; i >= 1; i -= 1) {
          expectedResult.push(i);
          promises.push(queue.push(i));
        }

        // Wait for all messages in the queue to have been processed, then
        // compare the expected result with:
        // 1. The results returned by all promises (from callbacks)
        // 2. The results in `messages` creating by pushing the message into the
        // array after each callback returns.
        return Promise.all(promises).then((promiseResults) => {
          const expected = JSON.stringify(expectedResult);
          if (expected !== JSON.stringify(messages)) {
            reject(new Error(`Wrong order in 'messages' ${JSON.stringify(messages)}`));
          } else if (expected !== JSON.stringify(promiseResults)) {
            reject(new Error(`Wrong order in 'promises' ${JSON.stringify(promiseResults)}`));
          } else {
            resolve();
          }
        });
      }));

      it('should process all messages in the queue', function () {
        let processedMessages = 0;
        const queue = MessageQueue('test', () => { processedMessages += 1; });

        return Promise.all([
          queue.push(() => {}),
          queue.push(() => {})
        ])
          .then(() => {
            expect(queue.getSize()).to.equal(0);
            expect(processedMessages).to.equal(2);
          });
      });

      it('should sequentialize the execution of messages', function () {
        const events = [];
        const queue = MessageQueue('test', x => x());

        const p1 = () => Promise.resolve()
          .then(() => { events.push(1); })
          .then(() => { events.push(2); })
          .then(() => { events.push(3); })
          .then(() => { events.push(4); });
        const p2 = () => Promise.resolve()
          .then(() => { events.push(5); })
          .then(() => { events.push(6); })
          .then(() => { events.push(7); })
          .then(() => { events.push(8); });

        return Promise.all([
          queue.push(p1),
          queue.push(p2)
        ])
          .then(() => {
            expect(events).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8]);
          });
      });

      it('should keep processing messages even if one failed', function () {
        const events = [];
        const queue = MessageQueue('test', x => x());

        const p1 = () => Promise.resolve()
          .then(() => { events.push(1); })
          .then(() => { events.push(2); })
          .then(() => { events.push(3); })
          .then(() => { events.push(4); });
        const p2 = () => Promise.resolve()
          .then(() => { events.push(5); })
          .then(() => { events.push(6); })
          .then(() => { events.push(7); })
          .then(() => { events.push(8); })
          .then(() => { throw new Error('intentionally thrown'); });
        const p3 = () => Promise.resolve()
          .then(() => { events.push(9); })
          .then(() => { events.push(10); })
          .then(() => { events.push(11); })
          .then(() => { events.push(12); });

        return Promise.all([
          queue.push(p1),
          queue.push(p2).catch(() => {}),
          queue.push(p3)
        ])
          .then(() => {
            expect(events).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
            expect(queue.getSize()).to.equal(0);
          });
      });

      it('Waiting for the last message should sequentialize everything', function () {
        const events = [];
        const queue = MessageQueue('test', x => x());

        queue.push(() => Promise.resolve()
          .then(() => {})
          .then(() => {})
          .then(() => {})
          .then(() => { events.push(1); })
          .then(() => { events.push(2); })
          .then(() => { events.push(3); })
          .then(() => { events.push(4); }));
        queue.push(() => { events.push(5); });
        queue.push(() => Promise.resolve().then(() => { events.push(6); }));
        queue.push(() => { events.push(7); });
        const finalPromise = queue.push(() => { events.push(8); });

        return finalPromise.then(() => {
          expect(events).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8]);
          expect(queue.getSize()).to.equal(0);
        });
      });
    });
  });
