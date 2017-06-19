/* global chai */
/* global describeModule */
/* global require */


function getRandomInt(min, max) {
  const imin = Math.ceil(min);
  const imax = Math.floor(max);
  return Math.floor(Math.random() * (imax - imin)) + imin;
}


export default describeModule('proxyPeer/message-queue',
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
    describe('MessageQueue', function messageQueueTests() {
      this.timeout(10000);

      let MessageQueue;

      beforeEach(function importMessageQueue() {
        MessageQueue = this.module().default;
      });

      it('Resolve with 1 message', () => new Promise((resolve) => {
        const queue = MessageQueue('tests', () => resolve());
        return queue.push(42);
      }));

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
            reject(`Wrong order in 'messages' ${JSON.stringify(messages)}`);
          } else if (expected !== JSON.stringify(promiseResults)) {
            reject(`Wrong order in 'promises' ${JSON.stringify(promiseResults)}`);
          } else {
            resolve();
          }
        });
      }));
    });
  },
);
