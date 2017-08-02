/* global chai */
/* global describeModule */

export default describeModule('antitracking/domain',
  () => ({
    'core/console': {
      default: console,
    },
    'platform/url': {
    }
  }), () => {
    let sameGeneralDomain;

    beforeEach(function initModule() {
      sameGeneralDomain = this.module().sameGeneralDomain;
    });

    describe('sameGeneralDomain', () => {

      [
        ['a.cliqz.com', 'b.cliqz.com'],
        ['x.y.cliqz.com', 'cliqz.com'],
        ['domain.with.co.uk', 'other.subdomain.with.co.uk'],
      ].forEach((pair) => {
        const [a, b] = pair;
        it(`'${a}' is same general domain as '${b}'`, () => {
          chai.expect(sameGeneralDomain(a, b)).to.be.true;
        });
      });

      [
        ['', 'example.com'],
        [undefined, 'example.com'],
        ['localhost', '127.0.0.1'],
        ['a.cliqz.com', 'b.kliqz.com'],
        ['same.registered.co.uk', 'other.registered.com'],
      ].forEach((pair) => {
        const [a, b] = pair;
        it(`'${a}' is not same general domain as '${b}'`, () => {
          chai.expect(sameGeneralDomain(a, b)).to.be.false;
        });
      });

    });
  }
);
