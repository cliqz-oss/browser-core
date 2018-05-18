/* global chai */
/* global describeModule */

const tldjs = require('tldjs');

export default describeModule('core/url',
  function () {
    return {
      'platform/lib/tldjs': {
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
          this.deps('platform/url').default = () => false;
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

      describe('#getDetailsFromUrl', function () {
        let getDetailsFromUrl;
        beforeEach(function () {
          getDetailsFromUrl = this.module().getDetailsFromUrl;
        });

        it('with simple url return correct details', function () {
          const urlDetails = {
            action: undefined,
            originalUrl: 'https://cliqz.com/',
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

        it('with moz-action should return correct action and url', function () {
          const urlDetails = {
            action: 'visiturl',
            originalUrl: 'https://cliqz.com/',
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
          chai.expect(getDetailsFromUrl('moz-action:visiturl,{"url":"https://cliqz.com/"}'))
            .to.deep.equal(urlDetails);
        });

        it('should handle no scheme, no path, no query, no fragment', function () {
          const parts = getDetailsFromUrl('www.facebook.com');
          chai.expect(parts.domain).to.equal('facebook.com');
          chai.expect(parts.host).to.equal('www.facebook.com');
          chai.expect(parts.name).to.equal('facebook');
          chai.expect(parts.subdomains[0]).to.equal('www');
          chai.expect(parts.tld).to.equal('com');
          chai.expect(parts.path).to.equal('');
          chai.expect(parts.query).to.equal('');
          chai.expect(parts.fragment).to.equal('');
          chai.expect(parts.scheme).to.equal('');
        });

        it('should handle scheme, path, query, no fragment', function () {
          const parts = getDetailsFromUrl('http://www.facebook.com/url?test=fdsaf');
          chai.expect(parts.ssl).to.equal(false);
          chai.expect(parts.domain).to.equal('facebook.com');
          chai.expect(parts.host).to.equal('www.facebook.com');
          chai.expect(parts.name).to.equal('facebook');
          chai.expect(parts.subdomains[0]).to.equal('www');
          chai.expect(parts.tld).to.equal('com');
          chai.expect(parts.path).to.equal('/url');
          chai.expect(parts.query).to.equal('test=fdsaf');
          chai.expect(parts.fragment).to.equal('');
          chai.expect(parts.scheme).to.equal('http:');
        });

        it('should handle no scheme, no path, no query, fragment', function () {
          const parts = getDetailsFromUrl('www.facebook.co.uk#blah');
          chai.expect(parts.ssl).to.equal(false);
          chai.expect(parts.domain).to.equal('facebook.co.uk');
          chai.expect(parts.host).to.equal('www.facebook.co.uk');
          chai.expect(parts.name).to.equal('facebook');
          chai.expect(parts.subdomains[0]).to.equal('www');
          chai.expect(parts.tld).to.equal('co.uk');
          chai.expect(parts.path).to.equal('');
          chai.expect(parts.query).to.equal('');
          chai.expect(parts.fragment).to.equal('blah');
        });

        it('should handle no scheme, path, no query, fragment', function () {
          const parts = getDetailsFromUrl('www.facebook.co.uk/url#blah');
          chai.expect(parts.ssl).to.equal(false);
          chai.expect(parts.domain).to.equal('facebook.co.uk');
          chai.expect(parts.host).to.equal('www.facebook.co.uk');
          chai.expect(parts.name).to.equal('facebook');
          chai.expect(parts.subdomains[0]).to.equal('www');
          chai.expect(parts.tld).to.equal('co.uk');
          chai.expect(parts.path).to.equal('/url');
          chai.expect(parts.query).to.equal('');
          chai.expect(parts.fragment).to.equal('blah');
        });

        it('should handle scheme, path, query, fragment, with port number', function () {
          const parts = getDetailsFromUrl('https://localhost:8080/url?test=fdsaf#blah');
          chai.expect(parts.ssl).to.equal(true);
          chai.expect(parts.domain).to.equal('');
          chai.expect(parts.host).to.equal('localhost');
          chai.expect(parts.name).to.equal('localhost');
          chai.expect(parts.subdomains.length).to.equal(0);
          chai.expect(parts.tld).to.equal('');
          chai.expect(parts.path).to.equal('/url');
          chai.expect(parts.query).to.equal('test=fdsaf');
          chai.expect(parts.fragment).to.equal('blah');
          chai.expect(parts.port).to.equal('8080');
        });

        it('should handle scheme, path, query, fragment, port number, IP address', function () {
          const parts = getDetailsFromUrl('https://192.168.11.1:8080/url?test=fdsaf#blah');
          chai.expect(parts.ssl).to.equal(true);
          chai.expect(parts.domain).to.equal('');
          chai.expect(parts.host).to.equal('192.168.11.1');
          chai.expect(parts.name).to.equal('IP');
          chai.expect(parts.subdomains.length).to.equal(0);
          chai.expect(parts.tld).to.equal('');
          chai.expect(parts.path).to.equal('/url');
          chai.expect(parts.query).to.equal('test=fdsaf');
          chai.expect(parts.fragment).to.equal('blah');
          chai.expect(parts.port).to.equal('8080');
        });

        it('should handle scheme, path, query, no fragment, with username and password', function () {
          const parts = getDetailsFromUrl('https://user:password@www.facebook.com/url?test=fdsaf');
          chai.expect(parts.ssl).to.equal(true);
          chai.expect(parts.domain).to.equal('facebook.com');
          chai.expect(parts.host).to.equal('www.facebook.com');
          chai.expect(parts.name).to.equal('facebook');
          chai.expect(parts.subdomains[0]).to.equal('www');
          chai.expect(parts.tld).to.equal('com');
          chai.expect(parts.path).to.equal('/url');
          chai.expect(parts.query).to.equal('test=fdsaf');
          chai.expect(parts.fragment).to.equal('');
          chai.expect(parts.scheme).to.equal('https:');
        });

        it('should handle scheme, path, query, fragment, with username and password', function () {
          const parts = getDetailsFromUrl('https://user:password@www.facebook.com/url?test=fdsaf#blah');
          chai.expect(parts.ssl).to.equal(true);
          chai.expect(parts.domain).to.equal('facebook.com');
          chai.expect(parts.host).to.equal('www.facebook.com');
          chai.expect(parts.name).to.equal('facebook');
          chai.expect(parts.subdomains[0]).to.equal('www');
          chai.expect(parts.tld).to.equal('com');
          chai.expect(parts.path).to.equal('/url');
          chai.expect(parts.query).to.equal('test=fdsaf');
          chai.expect(parts.fragment).to.equal('blah');
        });

        it('should handle scheme, path, query, fragment, with username and password, and port number', function () {
          const parts = getDetailsFromUrl('https://user:password@www.facebook.com:8080/url?test=fdsaf#blah');
          chai.expect(parts.ssl).to.equal(true);
          chai.expect(parts.domain).to.equal('facebook.com');
          chai.expect(parts.host).to.equal('www.facebook.com');
          chai.expect(parts.name).to.equal('facebook');
          chai.expect(parts.subdomains[0]).to.equal('www');
          chai.expect(parts.tld).to.equal('com');
          chai.expect(parts.path).to.equal('/url');
          chai.expect(parts.query).to.equal('test=fdsaf');
          chai.expect(parts.fragment).to.equal('blah');
          chai.expect(parts.port).to.equal('8080');
        });
      });
    });
  },
);
