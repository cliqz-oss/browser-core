/* global chai */
/* global describeModule */


let sendSignal = () => {};


export default describeModule('anolysis/signals-queue',
  () => ({
    'core/cliqz': {
      utils: {
        setInterval() {},
      },
    },
    'anolysis/logging': {
      default() {
      },
    },
    'anolysis/synchronized-date': {
      default() {},
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
      let db;

      beforeEach(function initDatabase() {
        db = [];
        storage = {
          put(doc) {
            return Promise.resolve(db.push(doc));
          },
          remove(doc) {
            return Promise.resolve(db.splice(db.indexOf(doc), 1));
          },
          info() {
            return Promise.resolve(db.length);
          },
          getN(n) {
            return Promise.resolve(db.slice(0, n));
          },
        };

        const SignalQueue = this.module().default;
        queue = new SignalQueue(storage);
      });

      it('pushes new messages in the queue', () => {
        return queue.push({ signal: 1 })
          .then(() => queue.push({ signal: 2 }))
          .then(size => chai.expect(size).to.equal(2));
      });

      it('process batch of size 1', () => {
        sendSignal = sinon.spy(() => Promise.resolve({ ok: true }));

        return queue.push({ signal: 1 })
          .then(() => queue.push({ signal: 2 }))
          .then(() => queue.processNextBatch(1))
          .then(() => chai.expect(db).to.have.length(1))
          .then(() => chai.expect(sendSignal).to.have.been.calledOnce);
      });

      it('process batch of size 2', () => {
        sendSignal = sinon.spy(() => Promise.resolve({ ok: true }));

        return queue.push({ signal: 1 })
          .then(() => queue.push({ signal: 2 }))
          .then(() => queue.processNextBatch(2))
          .then(() => chai.expect(db).to.have.length(0))
          .then(() => chai.expect(sendSignal).to.have.been.calledTwice);
      });

      it('does not delete signal when sendSignal fails', () => {
        sendSignal = sinon.spy(() => Promise.reject());

        return queue.push({ signal: 1 })
          .then(() => queue.push({ signal: 2 }))
          .then(() => queue.processNextBatch(2))
          .then(() => chai.expect(db).to.have.length(2))
          .then(() => chai.expect(sendSignal).to.have.been.calledTwice);
      });
    });
  },
);
