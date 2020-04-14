/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

const fsPromises = require('fs').promises;

const expect = chai.expect;

export default describeModule(
  'news/helpers',
  () => ({
    'core/crypto/random': {
      randomInt: () => 0,
    },
  }),
  () => {
    describe('URL normalization', function () {
      let normalize;
      let mocks;

      beforeEach(async function () {
        if (normalize === undefined) {
          normalize = (await this.system.import('core/url')).normalize;
        }
        if (mocks === undefined) {
          mocks = JSON.parse(
            await fsPromises.readFile(
              'tests/mocks/newsNormalizationExample.json',
              'utf8',
            ),
          );
        }
      });
      it('common news URLs', function () {
        for (const [originalUrl, expectedUrl] of Object.entries(mocks)) {
          const normalizedUrl = normalize(originalUrl);
          expect(
            normalizedUrl,
            `Expected ${originalUrl} to equal ${expectedUrl} but got ${normalizedUrl}`,
          ).to.equal(expectedUrl);
        }
      });
    });
  },
);
