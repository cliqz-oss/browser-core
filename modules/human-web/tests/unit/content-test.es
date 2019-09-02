/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */
/* global describeModule */

const fs = require('fs');
const zlib = require('zlib');
const R = require('ramda');
const mockBrowser = require('mock-browser');

const FIXTURES_BASE_PATH = 'modules/human-web/tests/unit/fixtures/content-test';

function loadFixture(name) {
  const html = zlib.gunzipSync(fs.readFileSync(`${FIXTURES_BASE_PATH}/${name}/page.html.gz`)).toString();
  const expectedAds = JSON.parse(fs.readFileSync(`${FIXTURES_BASE_PATH}/${name}/expected-ads.json`, 'utf8'));
  return { html, expectedAds };
}

const FAKE_CONSOLE = {
  debug() {},
  log() {},
  error() {},
};

export default describeModule('human-web/content',
  () => ({
    'platform/runtime': {
      default: {},
    },
    'platform/globals': {
      chrome: {},
    },
    'platform/content/globals': {
      chrome: {},
      window: {
        console: FAKE_CONSOLE,
      },
    },
    'human-web/logger': {
      default: FAKE_CONSOLE,
    },
  }),
  () => {
    const expect = chai.expect;

    describe('parseDom', function () {
      this.timeout(20000);
      let parseDom;
      let mockWindow;

      beforeEach(function () {
        parseDom = this.module().parseDom;
        mockWindow = mockBrowser.mocks.MockBrowser.createWindow();
      });

      afterEach(function () {
        delete global.chrome;
        if (mockWindow) {
          mockWindow.close();
          mockWindow = null;
        }
      });

      const checkDetectedAds = function ({ html, expectedAds }) {
        // Given
        const someUrl = 'http://example.com';
        const document = mockWindow.document;
        document.open();
        document.write(html);
        document.close();

        const adClickMessages = [];
        const unexpectedMessages = [];
        // mock of module action API in content script
        const hw = {
          action: (action, args) => {
            if (action === 'adClick') {
              adClickMessages.push(args);
            } else if (action === 'contentScriptTopAds') {
              // ignore
            } else {
              unexpectedMessages.push({ action, args });
            }
          }
        };

        // When
        parseDom(someUrl, mockWindow, hw);

        // Then
        expect(unexpectedMessages).to.be.empty;

        let foundAds;

        if (adClickMessages.length === 0) {
          foundAds = [];
        } else {
          expect(adClickMessages).to.have.lengthOf(1);
          const adDetails = adClickMessages[0].ads;

          foundAds = Object.keys(adDetails)
            .map(key => ({ key, url: adDetails[key].furl[1] }));
        }

        // To get a sane error message, only show a few examples.
        // Otherwise, it difficult to interpret the error messages.
        const numExamples = 4;
        const unexpectedAds = R.differenceWith(R.equals, foundAds, expectedAds);
        const missingAds = R.differenceWith(R.equals, expectedAds, foundAds);
        if (unexpectedAds.length > 0 || missingAds.length > 0) {
          // uncomment to export expectations:
          // fs.writeFileSync('/tmp/failing-test-expected-ads.json', JSON.stringify(foundAds));

          let errorMsg = 'Failed to correctly detect the ads:';
          if (unexpectedAds.length > 0) {
            const examples = R.take(numExamples, R.sortWith([R.prop('key'), R.prop('url')], unexpectedAds));
            examples.forEach((example) => {
              errorMsg += `\n- This should not have detected: ${JSON.stringify(example)}`;
            });
          }
          if (missingAds.length > 0) {
            const examples = R.take(numExamples, R.sortWith([R.prop('key'), R.prop('url')], missingAds));
            examples.forEach((example) => {
              errorMsg += `\n- This was overlooked:           ${JSON.stringify(example)}`;
            });
          }
          const stats = {
            found: {
              '#total': foundAds.length,
              '#urls': R.uniq(foundAds.map(x => x.url)).length
            },
            expected: {
              '#total': expectedAds.length,
              '#urls': R.uniq(expectedAds.map(x => x.url)).length
            }
          };
          errorMsg += `\nSummary: ${JSON.stringify(stats)}`;
          throw new Error(errorMsg);
        }

        // sanity check: at this point, it should never fail
        expect(foundAds).to.deep.equals(expectedAds);
      };

      it('should not find any ads on a blank page', function () {
        checkDetectedAds({
          html: '<!DOCTYPE html><html lang="en"><head></head><body></body></html>',
          expectedAds: []
        });
      });

      // some regression tests
      it('should find all shoe ads on the Google results page of "Schuhe kaufen"', function () {
        checkDetectedAds(loadFixture('shoe-ads-2019-07-24'));
      });

      it('should find all ads on the Google results page of "gardening shoes"', function () {
        checkDetectedAds(loadFixture('gardening-shoes-2019-07-24'));
      });

      it('should find all potato ads on the Google results page of "Kartoffeln kaufen"', function () {
        checkDetectedAds(loadFixture('potato-ads-2019-07-24'));
      });

      it('should find all coffee ads on the Google results page of "Der beste Kaffee der Welt"', function () {
        checkDetectedAds(loadFixture('coffee-ads-2019-07-24'));
      });

      it('should find nothing on a Google results page without ads', function () {
        checkDetectedAds(loadFixture('page-with-no-ads-2019-07-24'));
      });

      it('should find all flight ads on the Google results page of "flight paris to london"', function () {
        checkDetectedAds(loadFixture('flight-page-2019-07-24'));
      });

      it('Android user agent: page without ads', function () {
        checkDetectedAds(loadFixture('android-user-agent-page-without-ads-2019-07-24'));
      });

      // Note: I leave this test in, but only as a documentation if we
      // want to support mobile. It is not meant to define what is expected.
      // Even though the page shows ads, they are not detected.
      //
      // ----------------------------------------------------------------------
      //
      // (Note: The rest is an old comment from 2017. Be skeptical if it
      // still applies today.)
      //
      // On mobile, the mechanism is different from Desktop. The target url
      // does not show up the original html, instead you are redirected by
      // the Google link.
      //
      // To support it on Android, we would have to aggregate the state
      // between the redirects. In the example that I looked at there
      // were in total eight redirects until you finally end up on the
      // landing page of the shop. Ignoring internal redirects, it looked
      // like this:
      //
      //    https://www.googleadservices.com/pagead/aclk?...
      // -> http://clickserve.dartsearch.net/...
      // -> https://clickserve.dartsearch.net/...
      // -> https://clickserve.dartsearch.net/...
      // -> https://ad.doubleclick.net/...
      // -> https://www.jdsports.de/product/schwarz-adidas...
      //
      it('(status quo) Android user agent: page with ads', function () {
        checkDetectedAds(loadFixture('android-user-agent-page-with-ads-2019-07-24'));
      });
    });
  });
