/* global chai */
/* global describeModule */

const tldts = require('tldts');
const URL = require('url').URL;
const punycode = require('punycode');

if (!global.URL) {
  // node version less than 10
  global.URL = URL;
}

const URLS = [
  'http://cliqz.com',
  'http://www.cliqz.com',
  'http://userid:password@example.com:8080',
  'http://foo.com/blah_blah_(wikipedia)_(again)#cite-1',
  'http://www.example.com/foo/?bar=baz&inga=42&quux',
  'http://✪df.ws/123',
  'http://userid@example.com',
  'http://userid@example.com:8080/',
  'http://userid:password@example.com',
  'http://➡.ws/䨹',
  'http://⌘.ws',
  'http://⌘.ws/',
  'http://foo.com/unicode_(✪)_in_parens',
  'http://foo.com/(something)?after=parens',
  'http://☺.damowmow.com/',
  'http://code.google.com/events/#&product=browser',
  'http://foo.bar/baz',
  'http://foo.bar/?q=Test%20URL-encoded%20stuff',
  'http://مثال.إختبار',
  'http://例子.测试',
  'http://उदाहरण.परीक्षा',
  "http://-.~_!$&'()*+,;=:%40:80%2f::::::@example.com",

  // short url
  'http://j.mp',
  'https://t.co/2Y2tPh0TuJ/',

  // ip
  'http://142.42.1.1',
  'http://142.42.1.1:8080',
  'http://223.255.255.254',
  'http://[2001:4860:0:2001::68]/',
  'https://[2001:db8:85a3:8d3:1319:8a2e:370:7348]:443/',

  // url with known protocol
  'ftp://ftp.mozilla.org/pub/firefox/',
  'file:///etc/passwd',
  'chrome://cliqz/content/pairing/index.html',
  'moz-extension://f4091876df6a5d39e6690b7395a95399/index.html',
  'about:blank',
  'mailto:Cliqz <info@cliqz.com>',
  'view-source:https://cliqz.com',
  'data:text/plain,hello',
  'data:text,hello',
  'resource://devtools-client-jsonview/',

  // urls without protocols
  'cliqz.com',
  'www.cliqz.com',
  'userid:password@example.com:8080',
  'foo.com/blah_blah_(wikipedia)_(again)#cite-1',
  'www.example.com/foo/?bar=baz&inga=42&quux',
  '✪df.ws/123',
  'userid@example.com',
  'userid@example.com:8080/',
  'userid:password@example.com',
  '➡.ws/䨹',
  '⌘.ws',
  '⌘.ws/',
  'foo.com/unicode_(✪)_in_parens',
  'foo.com/(something)?after=parens',
  '☺.damowmow.com/',
  'code.google.com/events/#&product=browser',
  'foo.bar/baz',
  'foo.bar/?q=Test%20URL-encoded%20stuff',
  'مثال.إختبار',
  '例子.测试',
  'उदाहरण.परीक्षा',
  "-.~_!$&'()*+,;=:%40:80%2f::::::@example.com",
  '1337.net',
  'a.d-b.de',

  // short URLs
  'j.mp',
  't.co/2Y2tPh0TuJ/',

  // ip
  '142.42.1.1/',
  '142.42.1.1:8080',
  '223.255.255.254',
  '[2001:4860:0:2001::68]',
  '[2001:db8:85a3:8d3:1319:8a2e:370:7348]:443/',

  // invalid, but fixable
  'https://cliqz.com.',
  'https://cliqz.com. ',
  'http://192.168.1.1.',
  'cliqz.com.',
  'cliqz.com. ',
  '192.168.1.1.',

  // special exception
  'localhost',
  'LOCALHOST',

  // known protocol + host, or host + port
  'http:localhost',
  'http:localhost:4300',
  'http:weird-local-domain.dev',
  'maghratea:8080',
  'cliqz-test:4300',

  // other weirdness
  'http://www.f',
  'http:////a',
];

const QUERIES = [
  // search query
  'cliqz',
  'google.com is a suspicious site',
  'how do I go to facebook.com?',
  'undefined',

  // search alias
  '#go youtube.com',

  // bad url
  'cliqz,com',
  'cliqz.c om',
  'cliqz.c/om',
  'cliqz.com..',
  'cliqz.com.. ',
  'cliqz.com. .',
  'cliqz.c',
  'i.e',
  '-cliqz.com',
  'cliqz-.cat',
  'cliqz-.com',
  '.www.foo.bar.',
  'about:',
  'https://?query=0#top',
  'http:// shouldfail.com',
  'https://@_@_@_@_@',
  'http://facebok.com is a fishing site',

  // unknown protocol
  'abc://cliqz.com',
  "KeyError: 'credential_provider'",

  // bad port
  'warhammer:40k',
  // '192.168.1.1:65536',
  // 'www.bild.de:0',

  // unicode in hostname and no protocol or TLD
  'Wiedźmin_3:Dziki_Gon',
];

export default describeModule('core/url',
  function () {
    return {
      'platform/lib/tldts': tldts,
      'core/platform': {
      },
      'core/LRU': {
        default: class {
          get() { }

          set() {}
        },
      },
      'platform/lib/punycode': {
        default: punycode,
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

      describe('#isUrl', function () {
        let isUrl;

        beforeEach(function () {
          isUrl = this.module().isUrl;
        });

        describe('should return true on URLs or URL-like strings', () => {
          URLS.forEach((urlStr) => {
            it(urlStr, () => chai.expect(isUrl(urlStr)).to.be.true);
          });
        });

        describe('should return false on non-URL-like strings', () => {
          QUERIES.forEach((queryStr) => {
            it(queryStr, () => chai.expect(isUrl(queryStr)).to.be.false);
          });
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

        it('with host name, followed by a `single` dot, should return correct url', function () {
          const urlDetails = {
            action: undefined,
            originalUrl: 'https://cliqz.com./support',
            scheme: 'https:',
            name: 'cliqz',
            domain: 'cliqz.com',
            tld: 'com',
            subdomains: [],
            path: '/support',
            query: '',
            fragment: '',
            extra: '/support',
            host: 'cliqz.com',
            cleanHost: 'cliqz.com',
            ssl: true,
            port: '',
            friendly_url: 'cliqz.com/support',
          };
          chai.expect(getDetailsFromUrl('https://cliqz.com./support'))
            .to.deep.equal(urlDetails);
        });

        it('with trailing spaces, returns the same as without', function () {
          const detailsFromUrl1 = getDetailsFromUrl('https://cliqz.com');
          const detailsFromUrl2 = getDetailsFromUrl('https://cliqz.com  ');

          chai.expect(detailsFromUrl1)
            .to.deep.equal(detailsFromUrl2);
        });

        it('should handle no scheme, no path, no query, no fragment', function () {
          const parts = getDetailsFromUrl('www.facebook.com');
          chai.expect(parts.domain).to.equal('facebook.com');
          chai.expect(parts.host).to.equal('www.facebook.com');
          chai.expect(parts.name).to.equal('facebook');
          chai.expect(parts.subdomains[0]).to.equal('www');
          chai.expect(parts.tld).to.equal('com');
          chai.expect(parts.path).to.equal('/');
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
          chai.expect(parts.path).to.equal('/');
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

        it('should handle special network addresses', function () {
          const parts = getDetailsFromUrl('http://magrathea:8000/');
          chai.expect(parts.ssl).to.equal(false);
          chai.expect(parts.domain).to.equal('magrathea');
          chai.expect(parts.host).to.equal('magrathea');
          chai.expect(parts.name).to.equal('magrathea');
          chai.expect(parts.subdomains.length).to.equal(0);
          chai.expect(parts.tld).to.equal('magrathea');
          chai.expect(parts.path).to.equal('/');
          chai.expect(parts.query).to.equal('');
          chai.expect(parts.fragment).to.equal('');
          chai.expect(parts.port).to.equal('8000');
        });

        it('about url', function () {
          const parts = getDetailsFromUrl('about:supp');
          chai.expect(parts.ssl).to.equal(false);
          chai.expect(parts.domain).to.equal('');
          chai.expect(parts.host).to.equal('');
          chai.expect(parts.name).to.equal('supp');
          chai.expect(parts.subdomains.length).to.equal(0);
          chai.expect(parts.tld).to.equal('');
          chai.expect(parts.path).to.equal('supp');
          chai.expect(parts.query).to.equal('');
          chai.expect(parts.fragment).to.equal('');
          chai.expect(parts.port).to.equal('');
        });

        it('localhost', function () {
          const parts = getDetailsFromUrl('localhost');
          chai.expect(parts.domain).to.equal('');
          chai.expect(parts.ssl).to.equal(false);
          chai.expect(parts.domain).to.equal('');
          chai.expect(parts.host).to.equal('localhost');
          chai.expect(parts.name).to.equal('localhost');
          chai.expect(parts.subdomains.length).to.equal(0);
          chai.expect(parts.tld).to.equal('');
          chai.expect(parts.path).to.equal('/');
          chai.expect(parts.query).to.equal('');
          chai.expect(parts.fragment).to.equal('');
          chai.expect(parts.port).to.equal('');
        });
      });
    });

    describe('#isPrivateIP', function () {
      let isPrivateIP;
      beforeEach(function () {
        isPrivateIP = this.module().isPrivateIP;
      });

      it('should detect private ipv4 subnets', function () {
        chai.expect(isPrivateIP('127.0.0.1')).to.be.true;
        chai.expect(isPrivateIP('192.168.2.107')).to.be.true;
        chai.expect(isPrivateIP('192.168.1.41')).to.be.true;
        chai.expect(isPrivateIP('10.0.5.250')).to.be.true;
      });

      it('should detect public ipv4 subnets', function () {
        chai.expect(isPrivateIP('93.184.216.34')).to.be.false;
      });

      // once we add support for ipv6, this test is expected to pass
      it('should detect private ipv6 subnets', function () {
        chai.expect(isPrivateIP('::1')).to.be.true;
        chai.expect(isPrivateIP('0:0:0:0:0:0:0:1')).to.be.true;
        chai.expect(isPrivateIP('fd12:3456:789a:1::1')).to.be.true;
      });

      it('should detect public ipv6 address', function () {
        chai.expect(isPrivateIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).to.be.false;
      });
    });
  });
