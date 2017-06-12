/* global chai */
/* global describeModule */
/* global require */


export default describeModule('core/tlds',
  () => ({
    'platform/url': {
      isURI() { return false; },
      default: {
      },
    },
  }),
  () => {
    let tlds;

    beforeEach(function importDefault() {
      tlds = this.module().default;
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
            chai.expect(tlds.getGeneralDomain(subDomain)).to.equal(generalDomain);
          });
        });
      });
    });
  },
);
