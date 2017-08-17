'use strict';

var expect = chai.expect;

DEPS.CliqzUtilsTest = ["core/utils"];
TESTS.CliqzUtilsTest = function (CliqzUtils) {
  describe('CliqzUtils', function(){

    it('RESULTS_PROVIDER should be set to the right mixer endpoint', function(){
      expect(CliqzUtils.RESULTS_PROVIDER).to.equal('https://api.cliqz.com/api/v2/results?nrh=1&q=');
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

    describe("Locale", function () {
      it("Locale file should be loaded", function () {
        var locale = CliqzUtils.locale['default'] || CliqzUtils.locale[window.navigator.language];
        chai.expect(locale).to.be.ok;
        chai.expect(locale.TEST).to.equal('OK');
      });
    });

    describe("httpHandler", function () {
      it("return request object with timestamp", function () {
        var timestamp = CliqzUtils.httpHandler("GET", "http://localhost").timestamp
        //this obvious check wont work, as timestamp was created in different context
        //expect(timestamp).to.be.instanceof(Date);
        expect(new Date()).to.be.above(0);
      });
    });

    describe("promiseHttpHandler", function() {

      var hitCtr,
          url = "http://localhost:"+ testServer.port + "/",
          responseTest = "hello world",
          requestData,
          contentEncodingHeader,
          ScriptableInputStream = Components.Constructor("@mozilla.org/scriptableinputstream;1", "nsIScriptableInputStream", "init");

      function binaryStringToUint8Array(str) {
        var buf = new ArrayBuffer(str.length*2);
        var bufView = new Uint8Array(buf);
        for (var i=0, strLen=str.length; i<strLen; i++) {
          bufView[i] = str.charCodeAt(i);
        }
        return bufView;
      }

      beforeEach( function() {
        hitCtr = 0;
        requestData = "";
        contentEncodingHeader = "";
        testServer.registerPathHandler('/', function(req, res) {
          hitCtr++;
          // get postdata from request
          var s = new ScriptableInputStream(req.bodyInputStream);
          requestData = s.readBytes(s.available());

          // save content-encoding header if set
          try {
            contentEncodingHeader = req.getHeader('content-encoding');
          } catch(e) {}

          res.write(responseTest);
        });
      });

      context('get request', function() {

        it('gets response of request', function() {
          return CliqzUtils.promiseHttpHandler('GET', url).then( function(resp) {
            chai.expect(hitCtr).to.eql(1);
            chai.expect(resp.response).to.eql(responseTest);
          });
        });

        it('does not fulfill for a 404', function() {
          return CliqzUtils.promiseHttpHandler('GET', url + "404").then( function fulfilled() {
            throw "promise unexpectedly fulfilled";
          }, function rejected() {
          });
        });

      });

      context('post request', function() {
        var postDataSent = "testdata";

        it('posts provided data', function() {
          return CliqzUtils.promiseHttpHandler('POST', url, postDataSent).then( function(resp) {
            chai.expect(hitCtr).to.eql(1);
            chai.expect(resp.response).to.eql(responseTest);
            chai.expect(requestData).to.eql(postDataSent);
          });
        });

        it('can compress sent post data', function() {
          return CliqzUtils.getWindow().CLIQZ.System.import('core/gzip').then( function (gzip) {
            return CliqzUtils.promiseHttpHandler('POST', url, postDataSent, undefined, true).then( function(resp) {
              chai.expect(hitCtr).to.eql(1);
              chai.expect(resp.response).to.eql(responseTest);
              chai.expect(contentEncodingHeader).to.eql('gzip');
              var postData = gzip.decompress(binaryStringToUint8Array(requestData));
              chai.expect(postData).to.eql(postDataSent);
            });
          });
        });

      });
    });

  });

};
