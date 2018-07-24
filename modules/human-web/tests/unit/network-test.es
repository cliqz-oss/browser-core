/* global chai */
/* global describeModule */

const expect = chai.expect;

export default describeModule('human-web/network',
  () => ({
    'platform/human-web/dns': {
      default: {}
    },
    'human-web/logger': {
      default: {
        debug() {},
        log() {},
        error() {},
      }
    },
  }),
  () => {
    describe('isIPInternal', function () {
      let isIPInternal;

      beforeEach(function () {
        isIPInternal = this.module().isIPInternal;
      });

      it('should detect private ipv4 subnets', function () {
        expect(isIPInternal('127.0.0.1')).to.be.true;
        expect(isIPInternal('192.168.2.107')).to.be.true;
        expect(isIPInternal('192.168.1.41')).to.be.true;
        expect(isIPInternal('10.0.5.250')).to.be.true;
      });

      it('should detect public ipv4 subnets', function () {
        expect(isIPInternal('93.184.216.34')).to.be.false;
      });

      // once we add support for ipv6, this test is expected to pass
      it.skip('should detect private ipv6 subnets', function () {
        expect(isIPInternal('::1')).to.be.true;
        expect(isIPInternal('0:0:0:0:0:0:0:1')).to.be.true;
      });

      it('should detect public ipv6 address', function () {
        expect(isIPInternal('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).to.be.false;
      });
    });

    describe('parseHostname', function () {
      let parseHostname;

      beforeEach(function () {
        parseHostname = this.module().parseHostname;
      });

      it('should parse a simple domain', function () {
        expect(parseHostname('www.example.test')).to.eql({
          hostname: 'www.example.test',
          username: '',
          password: '',
          port: 80,
        });
      });

      it('should parse a complex domain', function () {
        expect(parseHostname('myuser:mypassword@example.test:1000')).to.eql({
          hostname: 'example.test',
          username: 'myuser',
          password: 'mypassword',
          port: 1000,
        });
      });
    });

    describe('parseURL', function () {
      let parseURL;

      beforeEach(function () {
        parseURL = this.module().parseURL;
      });

      it('should parse a simple URL', function () {
        expect(parseURL('http://www.example.test/')).to.eql({
          protocol: 'http',
          hostname: 'www.example.test',
          port: 80,
          username: '',
          password: '',
          path: '/',
          query_string: null,
        });
      });

      it('should parse an URL with params', function () {
        expect(parseURL('http://www.example.test/abc/def?param1=1&param2=2')).to.eql({
          protocol: 'http',
          hostname: 'www.example.test',
          port: 80,
          username: '',
          password: '',
          path: '/abc/def',
          query_string: 'param1=1&param2=2',
        });
      });

      // TODO: currently defaults to port 80 for https, which is unexpected
      it.skip('should parse a https URL', function () {
        expect(parseURL('https://www.example.test/')).to.eql({
          protocol: 'https',
          hostname: 'www.example.test',
          port: 443,
          username: '',
          password: '',
          path: '/',
          query_string: null,
        });
      });

      it('should parse a https URL (explicit port)', function () {
        expect(parseURL('https://www.example.test:443/')).to.eql({
          protocol: 'https',
          hostname: 'www.example.test',
          port: 443,
          username: '',
          password: '',
          path: '/',
          query_string: null,
        });
      });

      it('should parse IPv4 addresses', function () {
        expect(parseURL('http://127.0.0.1/')).to.include({
          hostname: '127.0.0.1'
        });
        expect(parseURL('http://127.0.0.1:8080/')).to.include({
          hostname: '127.0.0.1',
          port: 8080,
        });
      });

      it('should reject invalid URLs', function () {
        expect(parseURL('')).to.be.null;
        expect(parseURL('corrupted with space')).to.be.null;

        // missing schema:
        expect(parseURL('test')).to.be.null;
        expect(parseURL('example.test')).to.be.null;
      });

      // Technically, this is not a legal URL, but
      // human-web relies on this assumption:
      it('should allow unquoted characters in URLs', function () {
        const url = 'https://www.example.test/ (PROTECTED)';
        expect(parseURL(url).hostname).to.equal('www.example.test');
      });
    });
  }
);
