/* global chai */
/* global describeModule */

export default describeModule('antitracking/steps/check-context',
  () => ({
    'core/console': {
      default: {
        debug() {},
        log() {},
        error() {},
      },
    },
    'platform/url': {
    },
  }),
  () => {
    describe('checkSameGeneralDomain', () => {
      let checkSameGeneralDomain;

      beforeEach(function () {
        checkSameGeneralDomain = this.module().checkSameGeneralDomain;
      });

      function mockState(requestDomain, sourceDomain) {
        return {
          urlParts: {
            generalDomain: requestDomain,
          },
          tabUrlParts: {
            generalDomain: sourceDomain,
          }
        };
      }

      [
        ['cliqz.com', 'cliqz.com'],
        ['with.co.uk', 'with.co.uk'],
        ['registered.co.uk', 'registered.com'],
      ].forEach((pair) => {
        const [a, b] = pair;
        it(`stops pipeline with '${a}' and '${b}'`, () => {
          chai.expect(checkSameGeneralDomain(mockState(a, b))).to.be.false;
        });
      });

      [
        ['', 'example.com'],
        ['localhost', '127.0.0.1'],
        ['cliqz.com', 'kliqz.com'],
      ].forEach((pair) => {
        const [a, b] = pair;
        it(`does not stop pipeline with '${a}' and '${b}'`, () => {
          chai.expect(checkSameGeneralDomain(mockState(a, b))).to.be.true;
        });
      });
    });
  });
