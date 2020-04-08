/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { testServer, expect } from '../test-helpers';
import { promiseHttpHandler } from '../../../core/http';


export default function () {
  const url = testServer.getBaseUrl();
  const responseTest = 'hello world';

  beforeEach(() => testServer.registerPathHandler('/', { result: responseTest }));
  describe('fetch', () => {
    it('doesn\'t send origin header', async () => {
      await testServer.fetch();
      const hits = await testServer.getHitsForPath('/');
      const origin = hits[0].headers.origin;
      // Header was either removed or it didn't exist
      expect(origin === 'null' || origin === undefined).to.be.true;
    });
  });

  describe('promiseHttpHandler', () => {
    context('get request', () => {
      it('gets response of request', async () => {
        const resp = await promiseHttpHandler('GET', url);
        expect(resp.response).to.eql(responseTest);
        const hitCtr = await testServer.getHitCtr('/');
        expect(hitCtr).to.equal(1);
      });

      it('does not fulfill for a 404', () =>
        promiseHttpHandler('GET', `${url}404`)
          .then(
            () => { throw new Error('promise unexpectedly fulfilled'); },
            () => {},
          ));
    });

    context('post request', () => {
      const postDataSent = '{ "data": "testdata" }';

      it('posts provided data', async () => {
        const resp = await promiseHttpHandler('POST', url, postDataSent);
        expect(resp.response).to.eql(responseTest);
        const hits = (await testServer.getHits()).get('/');
        expect(hits.length).to.equal(1);
        expect(hits[0].body).to.eql(JSON.parse(postDataSent));
      });

      it.skip('can compress sent post data', function () {
        // TODO - this is currently not possible to test using the testServer we
        // have on chromium-tests. So it is currently disabled.
        // return promiseHttpHandler('POST', url, postDataSent, undefined, true)
        //   .then(function (resp) {
        //     expect(hitCtr).to.eql(1);
        //     expect(resp.response).to.eql(responseTest);
        //     expect(contentEncodingHeader).to.eql('gzip');
        //     const postData = gzip.decompress(binaryStringToUint8Array(requestData));
        //     expect(postData).to.eql(postDataSent);
        //   });
      });
    });
  });
}
