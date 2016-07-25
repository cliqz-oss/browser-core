'use strict';

TESTS.CliqzUtilsTest = function (CliqzUtils, CliqzTour) {
  describe('CliqzUtils', function(){
    describe('#HOST', function(){
      it('should be set to cliqz.com', function(){
        chai.expect(CliqzTour.VERSION).to.equal('1.1');
        chai.expect(CliqzUtils.HOST).to.equal('https://cliqz.com');
      });
    });

    describe('GetDetailsFromUrl', function() {
      it('should handle no scheme, no path, no query, no fragment', function() {
        var parts = CliqzUtils.getDetailsFromUrl('www.facebook.com');
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

      it('should handle scheme, path, query, no fragment', function() {
        var parts = CliqzUtils.getDetailsFromUrl('http://www.facebook.com/url?test=fdsaf');
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

      it('should handle no scheme, no path, no query, fragment', function() {
        var parts = CliqzUtils.getDetailsFromUrl('www.facebook.co.uk#blah');
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

      it('should handle no scheme, path, no query, fragment', function() {
        var parts = CliqzUtils.getDetailsFromUrl('www.facebook.co.uk/url#blah');
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

      it('should handle scheme, path, query, fragment, with port number', function() {
        var parts = CliqzUtils.getDetailsFromUrl('https://localhost:8080/url?test=fdsaf#blah');
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

      it('should handle scheme, path, query, fragment, port number, IP address', function() {
        var parts = CliqzUtils.getDetailsFromUrl('https://192.168.11.1:8080/url?test=fdsaf#blah');
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

      it('should handle scheme, path, query, no fragment, with username and password', function() {
        var parts = CliqzUtils.getDetailsFromUrl('https://user:password@www.facebook.com/url?test=fdsaf');
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

      it('should handle scheme, path, query, fragment, with username and password', function() {
        var parts = CliqzUtils.getDetailsFromUrl('https://user:password@www.facebook.com/url?test=fdsaf#blah');
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

      it('should handle scheme, path, query, fragment, with username and password, and port number', function() {
        var parts = CliqzUtils.getDetailsFromUrl('https://user:password@www.facebook.com:8080/url?test=fdsaf#blah');
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
};
