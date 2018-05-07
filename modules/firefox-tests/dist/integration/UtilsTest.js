/* global chai, getWindow, TESTS, testServer */

/* eslint func-names: 'off' */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

TESTS.UtilsTest = function (CliqzUtils) {
  describe('CliqzUtils', function () {
    describe('Locale', function () {
      it('Locale file should be loaded', function () {
        const locale = CliqzUtils.locale.default || CliqzUtils.locale[window.navigator.language];
        chai.expect(locale).to.be.ok;
        chai.expect(locale.TEST.message).to.equal('OK');
      });
    });

    describe('promiseHttpHandler', function () {
      let hitCtr;
      const url = `http://localhost:${testServer.port}/`;
      const responseTest = 'hello world';
      let requestData;
      let contentEncodingHeader;
      const ScriptableInputStream = Components.Constructor('@mozilla.org/scriptableinputstream;1', 'nsIScriptableInputStream', 'init');

      function binaryStringToUint8Array(str) {
        const buf = new ArrayBuffer(str.length * 2);
        const bufView = new Uint8Array(buf);
        for (let i = 0, strLen = str.length; i < strLen; i += 1) {
          bufView[i] = str.charCodeAt(i);
        }
        return bufView;
      }

      beforeEach(function () {
        hitCtr = 0;
        requestData = '';
        contentEncodingHeader = '';
        testServer.registerPathHandler('/', function (req, res) {
          hitCtr += 1;
          // get postdata from request
          const s = new ScriptableInputStream(req.bodyInputStream);
          requestData = s.readBytes(s.available());

          // save content-encoding header if set
          try {
            contentEncodingHeader = req.getHeader('content-encoding');
          } catch (e) {
            // empty
          }

          res.write(responseTest);
        });
      });

      context('get request', function () {
        it('gets response of request', function () {
          return CliqzUtils.promiseHttpHandler('GET', url)
            .then(function (resp) {
              chai.expect(hitCtr).to.eql(1);
              chai.expect(resp.response).to.eql(responseTest);
            });
        });

        it('does not fulfill for a 404', function () {
          return CliqzUtils.promiseHttpHandler('GET', `${url}404`)
            .then(function fulfilled() {
              throw new Error('promise unexpectedly fulfilled');
            }, function rejected() {
            });
        });
      });

      context('post request', function () {
        const postDataSent = 'testdata';

        it('posts provided data', function () {
          return CliqzUtils.promiseHttpHandler('POST', url, postDataSent)
            .then(function (resp) {
              chai.expect(hitCtr).to.eql(1);
              chai.expect(resp.response).to.eql(responseTest);
              chai.expect(requestData).to.eql(postDataSent);
            });
        });

        it('can compress sent post data', function () {
          const gzip = getWindow().CLIQZ.TestHelpers.gzip;
          return CliqzUtils.promiseHttpHandler('POST', url, postDataSent, undefined, true)
            .then(function (resp) {
              chai.expect(hitCtr).to.eql(1);
              chai.expect(resp.response).to.eql(responseTest);
              chai.expect(contentEncodingHeader).to.eql('gzip');
              const postData = gzip.decompress(binaryStringToUint8Array(requestData));
              chai.expect(postData).to.eql(postDataSent);
            });
        });
      });
    });
  });
};
