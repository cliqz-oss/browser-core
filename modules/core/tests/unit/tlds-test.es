/* global chai */
/* global describeModule */
/* global require */


const tldts = require('tldts');


export default describeModule('core/tlds',
  () => ({
    'platform/lib/tldts': tldts,
  }),
  () => {
    let sameGeneralDomain;
    let getGeneralDomain;

    beforeEach(function () {
      sameGeneralDomain = this.module().sameGeneralDomain;
      getGeneralDomain = this.module().getGeneralDomain;
    });

    describe('#sameGeneralDomain', () => {
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

    describe('#getGeneralDomain', () => {
      const spec = {
        'cliqz.com': ['cliqz.com', 'www.cliqz.com', 'a.b.cliqz.com'],
        'example.co.uk': ['example.co.uk', 'test.example.co.uk'],
        '127.0.0.1': ['127.0.0.1'],
        '1.2.3.4': ['1.2.3.4']
      };

      Object.keys(spec).forEach((generalDomain) => {
        spec[generalDomain].forEach((subDomain) => {
          it(`${subDomain} has general domain ${generalDomain}`, () => {
            chai.expect(getGeneralDomain(subDomain)).to.equal(generalDomain);
          });
        });
      });
    });
  });
