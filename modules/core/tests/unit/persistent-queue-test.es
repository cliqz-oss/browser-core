/* global chai */
/* global describeModule */

const PouchDB = System._nodeRequire('pouchdb');

export default describeModule('core/persistence/ordered-queue', 
  () => ({
    'platform/database': {
      default: (dbName, options) => {
        const globalOpts = {
          db: System._nodeRequire('memdown'),
        }
        return new PouchDB(dbName, Object.assign(globalOpts, options));
      },
    }
  }),
  () => {
    let OrderedQueue;

    beforeEach(function () {
      OrderedQueue = this.module().default;
    });

    describe('constructor', () => {
      it('creates an empty OrderedQueue instance', () => {
        const queue = new OrderedQueue('test');
        chai.expect(queue).to.exist;
        return queue.length().then((len) => {
          chai.expect(len).to.equal(0);
        });
      });

      it('throws an Error if name is invalid', () => {
        const badConstruct = () => new OrderedQueue();
        chai.expect(badConstruct).to.throw(Error);
      });

      it('multiple instances can point to the same db', () => {
        const queue1 = new OrderedQueue('test');
        const queue2 = new OrderedQueue('test');
        return queue1.offer('key', 'a').then(() => queue2.length()).then((len) => {
          chai.expect(len).to.equal(1);
        });
      });
    });

    context('interface', () => {

      let queue;

      beforeEach(() => {
        queue = new OrderedQueue('queueTest');
      });

      afterEach(() => {
        return queue.db.destroy();
      });

      describe('#offer', () => {
        it('adds an element to the queue', () => {
          return queue.offer('a', 0).then(() => queue.length()).then((len) => {
            chai.expect(len).to.equal(1);
          });
        });

        it('does not add duplicate elements', () => {
          return queue.offer('a', 0)
          .then(() => queue.offer('a', 1))
          .then(() => queue.length())
          .then((len) => {
            chai.expect(len).to.equal(1);  
          })
        });

        it('does not update sort value if element already exists', () => {
          return queue.offer('a', 'z')
          .then(() => queue.offer('a', 'y'))
          .then(() => queue.peek({}))
          .then((docs) => {
            chai.expect(docs.getDocs()[0].sort).to.equal('z');
          });
        });

        it('updates sort value if overwrite is true', () => {
          return queue.offer('a', 'z')
          .then(() => queue.offer('a', 'y', true))
          .then(() => queue.peek({}))
          .then((docs) => {
            chai.expect(docs.getDocs()[0].sort).to.equal('y');
          });
        });
      });

      const insertTestElements = () => {
        // insert some test data
        const toInsert = [['a', 'x'], ['b', 'z'], ['c', 'y']];
        return Promise.all(toInsert.map((args) => queue.offer(...args)))
      }

      const peekAndDrainTests = [
        {
          desc: 'returns a DocumentBatch of sorted elements from the queue',
          args: {},
          test: (batch) => {
            chai.expect(batch.getDocs()).to.have.length(3);
            chai.expect(batch.getRows().map(row => row.id)).to.eql(['a', 'c', 'b']);
          },
        }, {
          desc: 'descending option reverses the element ordering',
          args: { descending: true },
          test: (batch) => {
            chai.expect(batch.getDocs()).to.have.length(3);
            chai.expect(batch.getRows().map(row => row.id)).to.eql(['b', 'c', 'a']);
          },
        }, {
          desc: 'limit option limits the number of results',
          args: { limit: 2 },
          test: (batch) => {
            chai.expect(batch.getDocs()).to.have.length(2);
            chai.expect(batch.getRows().map(row => row.id)).to.eql(['a', 'c']);
          },
          returnedCount: 2,
        }, {
          desc: 'startKey option can filter the result set (inclusively)',
          args: { startkey: 'y' },
          test: (batch) => {
            chai.expect(batch.getDocs()).to.have.length(2);
            chai.expect(batch.getRows().map(row => row.id)).to.eql(['c', 'b']);
          },
          returnedCount: 2,
        }, {
          desc: 'endKey option can filter the result set (inclusively)',
          args: { endkey: 'y' },
          test: (batch) => {
            chai.expect(batch.getDocs()).to.have.length(2);
            chai.expect(batch.getRows().map(row => row.id)).to.eql(['a', 'c']);
          },
          returnedCount: 2,
        }
      ] 

      describe('#peek', () => {

        beforeEach(insertTestElements);

        peekAndDrainTests.forEach((spec) => {
          it(spec.desc, () => {
            return queue.peek(spec.args)
            .then(spec.test)
            .then(() => queue.length())
            .then((len) => {
              // check elements are not deleted
              chai.expect(len).to.eql(3);
            })
          });
        });
      });

      describe('drain', () => {

        beforeEach(insertTestElements);

        peekAndDrainTests.forEach((spec) => {
          it(spec.desc, () => {
            return queue.drain(spec.args)
            .then(spec.test)
            .then(() => queue.length())
            .then((len) => {
              // check elements are deleted
              chai.expect(len).to.equal(3 - (spec.returnedCount || 3));
            })
          });
        });
      });
    });
  }
);