/* global chai */
/* global describeModule */
/* global require */


const TEST_CASES = [
  { hostname: 'google.com', hostnames: ['google.com'], match: true },
  { hostname: 'test.com', hostnames: ['google.com', 'test.com'], match: true },
  { hostname: 'sub.test.com', hostnames: ['google.com', 'test.com'], match: true },
  { hostname: 'sub.test.com', hostnames: ['google.com', 'sub.test.com'], match: true },
  { hostname: 'sub.test.com', hostnames: ['google.com', 'sub.test.*'], match: true },
  { hostname: 'sub.test.com.fr', hostnames: ['google.com', 'sub.test.*'], match: true },
  { hostname: 'google.com.br', hostnames: ['google.*'], match: true },
  { hostname: 'google.com', hostnames: ['google.*'], match: true },
  { hostname: 'google.ca', hostnames: ['google.*'], match: true },
  { hostname: 'google.co.uk', hostnames: ['google.*'], match: true },
  { hostname: 'google.evil.biz', hostnames: ['google.*'], match: false },
  { hostname: 'google.evil.com', hostnames: ['google.*'], match: false },
  { hostname: 'evil-google.com', hostnames: ['google.com'], match: false },
  { hostname: 'sub.evil-google.com', hostnames: ['google.com'], match: false },
  { hostname: 'sub.evil-google.com', hostnames: ['google.*'], match: false },
  { hostname: 'sub.evil.google.com', hostnames: ['google.com'], match: true },
];


export default describeModule('core/adblocker-base/filters-matching',
  () => ({
    'platform/url': {},
    'core/utils': {},
    'core/console': {
      default: {
        debug() {},
        log() {},
        error() {},
      }
    },
  }),
  () => {
    describe('#matchCosmeticFilter', () => {
      let matchCosmeticFilter;

      // Generate test cases
      context('Cosmetic filter matching', () => {
        beforeEach(function importFilterMatcher() {
          matchCosmeticFilter = this.module().matchCosmeticFilter;
        });

        TEST_CASES.forEach((testCase) => {
          const hostname = testCase.hostname;
          const hostnames = testCase.hostnames;
          it(`matches ${JSON.stringify(testCase)}`,
            () => new Promise((resolve, reject) => {
              try {
                const match = matchCosmeticFilter(
                  {
                    hasHostnames() { return true; },
                    getHostnames() {
                      return hostnames;
                    }
                  },
                  hostname);
                if (testCase.match) {
                  chai.expect(match).to.not.equal(null);
                } else {
                  chai.expect(match).to.equal(null);
                }
              } catch (ex) {
                reject(`Expected ${hostname} ~= ${JSON.stringify(hostnames)} == ${testCase.match} (${ex})`);
              }
              resolve();
            })
          );
        });
      });
    });
  }
);
