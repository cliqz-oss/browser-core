/* global chai */
/* global describeModule */

const tldts = require('tldts');
const punycode = require('punycode');
const URL = require('url').URL;

if (!global.URL) {
  // node version less than 10
  global.URL = URL;
}

export default describeModule('core/fast-url-parser', () => ({
  'platform/lib/tldts': tldts,
  'platform/lib/punycode': {
    default: punycode,
  },
}), function () {
  describe('Matches URL API', function () {
    let FastURL;
    beforeEach(function () {
      FastURL = this.module().default;
    });

    function compareParameters(u1, u2) {
      const url1Params = u1.searchParams.entries();
      const url2Params = u2.searchParams.entries();
      let param1 = url1Params.next();
      let param2 = url2Params.next();
      while (!param1.done || !param2.done) {
        chai.expect(param2.done, 'searchParams length').to.equal(param1.done);
        chai.expect(param2.value[0], 'searchParam key').to.equal(param1.value[0]);
        chai.expect(param2.value[1], 'searchParam value').to.equal(param1.value[1]);
        param1 = url1Params.next();
        param2 = url2Params.next();
      }
    }

    [
      'http://cliqz.com/',
      'https://cliqz.com',
      'https://www.ghostery.com/test?awesome=true#page=1',
      'https://www.example.com/test;a=2?awesome=true#page=1',
      'http://192.168.1.1/page',
      'http://userid@example.com:8080/',
      'http://[2001:4860:0:2001::68]/',
      'https://[2001:db8:85a3:8d3:1319:8a2e:370:7348]:444/',
      'about:blank',
      'mailto:Cliqz <info@cliqz.com>',
      'view-source:https://cliqz.com',
      'data:text/plain,hello',
      'about:debugging',
      'HTTP://CAPS.EXAMPLE.COM/WhAT?',
      'http://xn--mnchen-3ya.de/',
    ].forEach((urlString) => {
      it(urlString, () => {
        const expected = new URL(urlString);
        const actual = new FastURL(urlString);

        chai.expect(actual.hash, 'hash').to.equal(expected.hash);
        chai.expect(actual.host, 'host').to.equal(expected.host);
        chai.expect(actual.hostname, 'hostname').to.equal(expected.hostname);
        chai.expect(actual.href, 'href').to.equal(expected.href);
        chai.expect(actual.origin, 'origin').to.equal(expected.origin);
        chai.expect(actual.password, 'password').to.equal(expected.password);
        chai.expect(actual.pathname, 'search').to.equal(expected.pathname);
        chai.expect(actual.protocol, 'protocol').to.equal(expected.protocol);
        chai.expect(actual.search, 'search').to.equal(expected.search);
        chai.expect(actual.username, 'username').to.equal(expected.username);

        chai.expect(actual.toString(), 'toString()').to.equal(expected.toString());
        chai.expect(actual.toJSON(), 'toJSON()').to.equal(expected.toJSON());

        compareParameters(expected, actual);
      });
    });

    [
      undefined,
      null,
      false,
      true,
      1,
      '',
      'http?://example.com',
      'example.com',
      'example.com/test',
      '/test',
      'https://[::-1]foobar:42/',
    ].forEach((urlString) => {
      it(`throws for ${urlString}`, () => {
        chai.expect(() => new URL(urlString), 'URL throws').to.throw();
        chai.expect(() => new FastURL(urlString), 'FastUrl throws').to.throw();
      });
    });

    // cases we know we don't handle... yet
    it('Does not parse relative paths', () => {
      const urlString = 'https://cliqz.com/test/../';
      const expected = new URL(urlString);
      const actual = new FastURL(urlString);

      chai.expect(actual.hash, 'hash').to.equal(expected.hash);
      chai.expect(actual.host, 'host').to.equal(expected.host);
      chai.expect(actual.hostname, 'hostname').to.equal(expected.hostname);
      chai.expect(actual.origin, 'origin').to.equal(expected.origin);
      chai.expect(actual.password, 'password').to.equal(expected.password);
      chai.expect(actual.protocol, 'protocol').to.equal(expected.protocol);
      chai.expect(actual.search, 'search').to.equal(expected.search);
      chai.expect(actual.username, 'username').to.equal(expected.username);

      chai.expect(actual.href, 'href').to.equal(urlString);
      chai.expect(expected.href, 'href').to.not.equal(urlString);
      chai.expect(actual.pathname, 'search').to.equal('/test/../');
    });

    it('does not automatically convert punycode hostnames', () => {
      const urlString = 'http://münchen.de';
      const expected = new URL(urlString);
      const actual = new FastURL(urlString);

      chai.expect(actual.hash, 'hash').to.equal(expected.hash);
      chai.expect(actual.password, 'password').to.equal(expected.password);
      chai.expect(actual.pathname, 'search').to.equal(expected.pathname);
      chai.expect(actual.protocol, 'protocol').to.equal(expected.protocol);
      chai.expect(actual.search, 'search').to.equal(expected.search);
      chai.expect(actual.username, 'username').to.equal(expected.username);

      // hostname and origin is not converted to punycode by FastURL
      chai.expect(actual.host, 'host').to.equal('münchen.de');
      chai.expect(actual.hostname, 'hostname').to.equal('münchen.de');
      chai.expect(expected.hostname, 'hostname').to.equal('xn--mnchen-3ya.de');

      // conversion can be achieved via `getPunycodeEncoded`
      const encoded = actual.getPunycodeEncoded();
      chai.expect(encoded.hostname).to.equal(expected.hostname);
      chai.expect(encoded.href, 'href').to.equal(expected.href);
      chai.expect(encoded.origin, 'origin').to.equal(expected.origin);
    });
  });
});
