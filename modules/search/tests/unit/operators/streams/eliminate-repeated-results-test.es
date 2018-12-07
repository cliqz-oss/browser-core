/* global chai, describeModule */

const Rx = require('rxjs');
const rxSandbox = require('rx-sandbox').rxSandbox;


const mock = {
  'platform/lib/rxjs': {
    default: Rx,
  },
};

// `a` and `b` have identical urls while `c` is different
const fixtures = {
  a: {
    query: { text: 'a' },
    responses: [{
      results: [{
        links: [{
          url: 'hello1.com'
        }, {
          url: 'hello2.com'
        }],
      }, {
        links: [{
          url: 'hello3.com'
        }]
      }]
    }],
  },
  b: {
    query: { text: 'b' },
    responses: [{
      results: [{
        links: [{
          url: 'hello1.com'
        }, {
          url: 'hello2.com'
        }],
      }, {
        links: [{
          url: 'hello3.com'
        }]
      }]
    }],
  },
  c: {
    query: { text: 'c' },
    responses: [{
      results: [{
        links: [{
          url: 'hello1.com'
        }, {
          url: 'hello2.com'
        }],
      }, {
        links: [{
          url: 'hello4.com'
        }]
      }]
    }],
  },
};

export default describeModule('search/operators/streams/eliminate-repeated-results',
  () => mock,
  () => {
    describe('#eliminateRepeatedResults', function () {
      let eliminateRepeatedResults;
      let sandbox;

      beforeEach(function () {
        sandbox = rxSandbox.create();
        eliminateRepeatedResults = this.module().default;
      });

      it('doesn\'t eliminate different results', function () {
        const source$ = sandbox.hot('-acb', fixtures);
        const expected = sandbox.e(' -acb', fixtures);

        const messages = sandbox.getMessages(source$.let(eliminateRepeatedResults()));
        sandbox.flush();

        return chai.expect(messages).to.deep.equal(expected);
      });

      it('eliminates repeated results', function () {
        const source$ = sandbox.hot('-abbbc', fixtures);
        const expected = sandbox.e(' -a---c', fixtures);

        const messages = sandbox.getMessages(source$.let(eliminateRepeatedResults()));
        sandbox.flush();

        return chai.expect(messages).to.deep.equal(expected);
      });
    });
  });
