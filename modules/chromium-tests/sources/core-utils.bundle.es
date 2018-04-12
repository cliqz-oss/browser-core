/* eslint func-names: 'off' */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-param-reassign: 'off' */

/* global chai */
/* global testServer */

import { utils } from '../core/cliqz';
import { getDetailsFromUrl } from '../core/url';
import * as gzip from '../core/gzip';


describe('utils', function () {
  it('RESULTS_PROVIDER should be set to the right mixer endpoint', function () {
    chai.expect(utils.RESULTS_PROVIDER).to.equal('https://api.cliqz.com/api/v2/results?nrh=1&q=');
  });

  describe('GetDetailsFromUrl', function () {
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

  describe('Locale', function () {
    it('Locale file should be loaded', function () {
      // TODO - this is specific to firefox and might need to be done
      // differently for chromium.
      // const locale = utils.locale.default;
      // chai.expect(locale).to.be.ok;
      // chai.expect(locale.TEST).to.equal('OK');
    });
  });

  describe('httpHandler', function () {
    it('return request object with timestamp', function () {
      // const timestamp = utils.httpHandler('GET', 'http://localhost').timestamp;
      // this obvious check wont work, as timestamp was created in different context
      // expect(timestamp).to.be.instanceof(Date);
      // NOTE: `new Date()` returns something like: Fri Jun 09 2017 16:12:19 GMT+0200 (CEST)
      // chai.expect(new Date()).to.be.above(0);
    });
  });

  describe('promiseHttpHandler', function () {
    const url = testServer.getBaseUrl();
    const responseTest = 'hello world';
    let requestData;

    function binaryStringToUint8Array(str) {
      const buf = new ArrayBuffer(str.length * 2);
      const bufView = new Uint8Array(buf);
      for (let i = 0, strLen = str.length; i < strLen; i += 1) {
        bufView[i] = str.charCodeAt(i);
      }
      return bufView;
    }

    beforeEach(function () {
      requestData = '';
      return testServer.registerPathHandler('/', responseTest);
    });

    context('get request', function () {
      it('gets response of request', function () {
        return utils.promiseHttpHandler('GET', url)
          .then(resp => chai.expect(resp.response).to.eql(responseTest))
          .then(() => testServer.getHitCtr())
          .then(hitCtr => chai.expect(hitCtr).to.equal(1));
      });

      it('does not fulfill for a 404', function () {
        return utils.promiseHttpHandler('GET', `${url}404`).then(function fulfilled() {
          throw new Error('promise unexpectedly fulfilled');
        }, function rejected() {
        });
      });
    });

    context('post request', function () {
      const postDataSent = '{ "data": "testdata" }';

      it('posts provided data', function () {
        return utils.promiseHttpHandler('POST', url, postDataSent).then(function (resp) {
          chai.expect(resp.response).to.eql(responseTest);
        })
          .then(() => testServer.getHits())
          .then((hits) => {
            hits = hits['/'];
            chai.expect(hits.length).to.equal(1);
            chai.expect(hits[0].body).to.eql(JSON.parse(postDataSent));
          });
      });

      it.skip('can compress sent post data', function () {
        return utils.promiseHttpHandler('POST', url, postDataSent, undefined, true)
          .then(resp => chai.expect(resp.response).to.eql(responseTest))
          .then(() => testServer.getHitCtr())
          .then(hitCtr => chai.expect(hitCtr).to.equal(1))
          .then(() => testServer.getHits())
          .then((hits) => {
            const headers = hits['/'][0].headers;
            chai.expect(headers['content-encoding']).to.eql('gzip');
            const postData = gzip.decompress(binaryStringToUint8Array(requestData));
            chai.expect(postData).to.eql(postDataSent);
          });
      });
    });
  });
});
