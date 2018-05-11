/* global chai */
/* global describeModule */

const tldjs = require('tldjs');

export default describeModule('core/url',
  function () {
    return {
      'tldjs': {
        default: tldjs,
      },
      'platform/url': {
        default: '[dynamic]',
      },
      'core/LRU': {
        default: class {
          get() {}
          set() {}
        },
      },
    };
  },
  function () {
    describe('url', function () {
      describe('compare', function () {
        let equals;
        beforeEach(function () {
          equals = this.module().equals;
        });
        it('with exactly same urls returns true', function () {
          chai.expect(equals('https://cliqz.com', 'https://cliqz.com')).to.be.true;
        });

        it('with missing urls returns false', function () {
          chai.expect(equals('https://cliqz.com', '')).to.be.false;
          chai.expect(equals('', 'https://cliqz.com')).to.be.false;
          chai.expect(equals('', '')).to.be.false;
        });

        it('with the same decoded urls return true', function () {
          chai.expect(equals('https://en.wikipedia.org/wiki/Murphy\'s_law', 'https://en.wikipedia.org/wiki/Murphy%27s_law')).to.be.true;
          chai.expect(equals('https://de.wikipedia.org/wiki/Stojanka_Novaković', 'https://de.wikipedia.org/wiki/Stojanka_Novakovi%C4%87')).to.be.true;
        });
      });

      describe('details', function () {
        let getDetailsFromUrl;
        beforeEach(function () {
          getDetailsFromUrl = this.module().getDetailsFromUrl;
        });

        it('with simple url return correct details', function () {
          const urlDetails = {
            scheme: 'https:',
            name: 'cliqz',
            domain: 'cliqz.com',
            tld: 'com',
            subdomains: [],
            path: '/',
            query: '',
            fragment: '',
            extra: '/',
            host: 'cliqz.com',
            cleanHost: 'cliqz.com',
            ssl: true,
            port: '',
            friendly_url: 'cliqz.com',
          };
          chai.expect(getDetailsFromUrl('https://cliqz.com/'))
              .to.deep.equal(urlDetails);
        });

        it('with url contains path return correct path', function () {
          const subject = getDetailsFromUrl('https://cliqz.com/m/');

          chai.expect(subject)
            .to.have.property('path')
            .that.equal('/m/');
        });

        it('with url contains port return correct port', function () {
          const subject = getDetailsFromUrl('https://cliqz.com:3000');

          chai.expect(subject)
            .to.have.property('port')
            .that.equal('3000');
        });

        it('with url contains query return correct query and extra', function () {
          const subject = getDetailsFromUrl('https://cliqz.com/?query1=test&query2=done');

          chai.expect(subject)
            .to.have.property('query')
            .that.equal('query1=test&query2=done');
          chai.expect(subject)
            .to.have.property('extra')
            .that.equal('/?query1=test&query2=done');
        });

        it('with url starts with www and contains subdomains return correct subdomains', function () {
          const subject = getDetailsFromUrl('https://www.affiliate-program.cliqz.com/');

          chai.expect(subject)
            .to.have.property('subdomains')
            .that.deep.equal(['www', 'affiliate-program']);
        });
      });
    });
  },
);
