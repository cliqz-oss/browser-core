/* global chai, describeModule, sinon */

const Rx = require('rxjs');
const rxSandbox = require('rx-sandbox').rxSandbox;

// Rx.Observable.interval without mocking does not seem to work with rxSandbox
let intervalMock;

const mock = {
  'platform/lib/rxjs': {
    default: {
      ...Rx,
      Observable: {
        ...Rx.Observable,
        interval: i => intervalMock(i),
      }
    }
  },
};

export default describeModule('search/operators/streams/throttle-queries',
  () => mock,
  () => {
    describe('#throttleQueries', function () {
      let throttleQueries;
      let sandbox;

      const config = {
        operators: {
          streams: {
            throttleQueries: {
              interval: 99,
            }
          }
        }
      };

      beforeEach(function () {
        sandbox = rxSandbox.create();
        const getThrottleQueries = this.module().default;
        throttleQueries = getThrottleQueries(config);
      });


      it('uses config', function () {
        const signal$ = sandbox.hot('xxx');
        intervalMock = sinon.spy(() => sandbox.hot('-x-'));

        sandbox.getMessages(signal$.let(throttleQueries));
        sandbox.flush();

        return chai.expect(intervalMock).to.have.been.calledWith(99);
      });

      it('emits first value', function () {
        const signal$ = sandbox.hot(' -11');
        intervalMock = () => sandbox.hot('---');
        const expected = sandbox.e('  -1-');

        const messages = sandbox.getMessages(signal$.let(throttleQueries));
        sandbox.flush();

        return chai.expect(messages).to.deep.equal(expected);
      });

      it('emits on selector', function () {
        const signal$ = sandbox.hot('    -1-234-56--');
        intervalMock = () => sandbox.hot('----x-');
        const expected = sandbox.e('     -1---4-5---6');

        const messages = sandbox.getMessages(signal$.let(throttleQueries));
        sandbox.flush();

        return chai.expect(messages).to.deep.equal(expected);
      });
    });
  },
);
