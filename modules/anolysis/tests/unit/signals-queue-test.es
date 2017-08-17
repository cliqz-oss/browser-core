/* global chai */
/* global describeModule */


let sendSignal = () => {};


export default describeModule('anolysis/signals-queue',
  () => ({
    'core/cliqz': {
      utils: {
        setInterval() {},
        setTimeout(cb) { cb(); },
      },
    },
    'core/console': { default: {} },
    'anolysis/logger': {
      default: {
        debug() {},
        log() {},
        error() {},
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
        db = new Map();
        storage = {
          put(doc) {
            return Promise.resolve(db.set(doc._id, doc));
          },
          remove(doc) {
            return Promise.resolve(db.delete(doc._id));
          },
          info() {
            return Promise.resolve(db.size);
          },
          getN(n) {
            return Promise.resolve([...db.values()].slice(0, n));
          },
        };

        const SignalQueue = this.module().default;
        queue = new SignalQueue(storage);
      });

      it('pushes new messages in the queue', () => {
        return queue.push({ signal: 1 })
          .then(() => queue.push({ signal: 2 }))
          .then(() => chai.expect(db.size).to.equal(2));
      });

      it('process batch of size 1', () => {
        sendSignal = sinon.spy(() => Promise.resolve({ ok: true }));

        return queue.push({ signal: 1 })
          .then(() => queue.push({ signal: 2 }))
          .then(() => queue.processNextBatch(1))
          .then(() => chai.expect(db.size).to.equal(1))
          .then(() => chai.expect(sendSignal).to.have.been.calledOnce);
      });

      it('process batch of size 2', () => {
        sendSignal = sinon.spy(() => Promise.resolve({ ok: true }));

        return queue.push({ signal: 1 })
          .then(() => queue.push({ signal: 2 }))
          .then(() => queue.processNextBatch(2))
          .then(() => chai.expect(db.size).to.equal(0))
          .then(() => chai.expect(sendSignal).to.have.been.calledTwice);
      });

      it('does not delete signal when sendSignal fails', () => {
        sendSignal = sinon.spy(() => Promise.reject());

        return queue.push({ signal: 1 })
          .then(() => queue.push({ signal: 2 }))
          .then(() => chai.expect(queue.processNextBatch(2)).to.be.rejected)
          .then(() => chai.expect(db.size).to.equal(2))
          .then(() => chai.expect(sendSignal).to.have.been.calledOnce);
      });
    });
  },
);
