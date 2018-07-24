/* globals chai */

import { testServer } from '../test-helpers';
import { promiseHttpHandler } from '../../../core/http';


export default function () {
  describe('promiseHttpHandler', () => {
    const url = testServer.getBaseUrl();
    const responseTest = 'hello world';

    beforeEach(() => testServer.registerPathHandler('/', responseTest));

    context('get request', () => {
      it('gets response of request', async () => {
        const resp = await promiseHttpHandler('GET', url);
        chai.expect(resp.response).to.eql(responseTest);
        const hitCtr = await testServer.getHitCtr();
        chai.expect(hitCtr).to.equal(1);
      });

      it('does not fulfill for a 404', () =>
        promiseHttpHandler('GET', `${url}404`)
          .then(
            () => { throw new Error('promise unexpectedly fulfilled'); },
            () => {},
          )
      );
    });

    context('post request', () => {
      const postDataSent = '{ "data": "testdata" }';

      it('posts provided data', async () => {
        const resp = await promiseHttpHandler('POST', url, postDataSent);
        chai.expect(resp.response).to.eql(responseTest);
        const hits = (await testServer.getHits()).get('/');
        chai.expect(hits.length).to.equal(1);
        chai.expect(hits[0].body).to.eql(JSON.parse(postDataSent));
      });

      it.skip('can compress sent post data', function () {
        // TODO - this is currently not possible to test using the testServer we
        // have on chromium-tests. So it is currently disabled.
        // return promiseHttpHandler('POST', url, postDataSent, undefined, true)
        //   .then(function (resp) {
        //     chai.expect(hitCtr).to.eql(1);
        //     chai.expect(resp.response).to.eql(responseTest);
        //     chai.expect(contentEncodingHeader).to.eql('gzip');
        //     const postData = gzip.decompress(binaryStringToUint8Array(requestData));
        //     chai.expect(postData).to.eql(postDataSent);
        //   });
      });
    });
  });
}
