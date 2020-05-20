/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

const expect = chai.expect;
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const mockBrowser = require('mock-browser');
const FileHound = require('filehound');
const stripJsonComments = require('strip-json-comments');

const EMPTY_HTML_PAGE = `
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html lang="en">
  <head>
    <meta http-equiv="content-type" content="text/html; charset=utf-8">
    <title>Test page</title>
  </head>
  <body>
  </body>
</html>`;

function jsonParse(text) {
  return JSON.parse(stripJsonComments(text));
}

const FIXTURES_BASE_PATH = 'modules/human-web-lite/tests/unit/fixtures/search-extractor';

function readFixtureFromDisk(_path) {
  const fixture = jsonParse(fs.readFileSync(`${FIXTURES_BASE_PATH}/${_path}/scenario.json`, 'utf8'));
  fixture.html = zlib.gunzipSync(fs.readFileSync(`${FIXTURES_BASE_PATH}/${_path}/page.html.gz`)).toString();
  return fixture;
}

function findAllFixtures() {
  function isFixtureDir(file) {
    if (!file.isDirectorySync()) {
      return false;
    }
    const base = file.getAbsolutePath();
    return fs.existsSync(path.join(base, 'scenario.json')) && fs.existsSync(path.join(base, 'page.html.gz'));
  }

  return FileHound.create()
    .path(FIXTURES_BASE_PATH)
    .directory()
    .addFilter(isFixtureDir)
    .findSync()
    .map(file => path.relative(FIXTURES_BASE_PATH, file));
}

export default describeModule('human-web-lite/search-extractor',
  () => ({
    'platform/globals': {
      default: {}
    },
    'core/crypto/random': {
      default: () => Math.random()
    }
  }),
  () => {
    describe('#SearchExtractor', function () {
      let SearchExtractor;
      let uut;
      let mockWindow;
      let doc;
      let fixture;
      let config;
      let ctry;
      let sanitizer;
      let persistedHashes;

      const setupDocument = function (html) {
        mockWindow = mockBrowser.mocks.MockBrowser.createWindow();

        doc = mockWindow.document;
        doc.open();
        doc.write(html);
        doc.close();
      };

      const initFixture = function (_path) {
        try {
          fixture = readFixtureFromDisk(_path);
          expect({ ...fixture, html: '<omitted>' }).to.include.keys('url', 'type', 'query', 'ctry');
          ctry = fixture.ctry;
          setupDocument(fixture.html);
        } catch (e) {
          throw new Error(`Failed to load test fixture "${_path}": ${e}`, e);
        }
      };

      const verifyFixtureExpectations = function (results) {
        // group messages by action
        const messages = {};
        results.forEach((msg) => { messages[msg.action] = []; });
        results.forEach((msg) => { messages[msg.action].push(msg); });

        // uncomment to export expectations:
        // fs.writeFileSync('/tmp/failing-test-expected-messages.json', JSON.stringify(messages));
        if (fixture.mustContain) {
          for (const check of fixture.mustContain) {
            if (!messages[check.action]) {
              throw new Error(`Missing message with action=${check.action}`);
            }

            // simplification for now: assume we will not send more than
            // one message of the same type. (If this assumption does not
            // hold, this test code needs to be extended.)
            expect(messages[check.action].length === 1);

            const realPayload = messages[check.action][0].payload;
            expect(realPayload).to.deep.equal(check.payload);
          }
        }

        if (fixture.mustNotContain) {
          for (const check of fixture.mustNotContain) {
            const blacklist = new RegExp(`^${check.action.replace('*', '.*')}$`);
            const matches = Object.keys(messages).filter(x => blacklist.test(x));
            if (matches.length > 0) {
              throw new Error(`Expected no messages with action '${check.action}' `
                              + `but got messages for the following actions: [${matches}]`);
            }
          }
        }
      };

      beforeEach(function () {
        SearchExtractor = this.module().default;
        config = { HW_CHANNEL: 'test-channel' };
        ctry = 'test-ctry';
        sanitizer = {
          getSafeCountryCode() {
            return ctry;
          }
        };
        persistedHashes = {};
        uut = new SearchExtractor({ config, sanitizer, persistedHashes });
      });

      afterEach(function () {
        doc = null;
        fixture = null;
        if (mockWindow) {
          mockWindow.close();
          mockWindow = null;
        }
      });

      it('should not find anything on a blank page', function () {
        setupDocument(EMPTY_HTML_PAGE);
        const messages = uut.extractMessages({
          doc,
          type: 'search-go',
          query: 'dummy query',
          doublefetchUrl: 'https://dummy.test/',
        });
        expect(messages).to.deep.equal([]);
      });

      findAllFixtures().forEach((fixtureDir) => {
        describe(`in scenario: ${fixtureDir}`, function () {
          it('should pass the fixture\'s expections', function () {
            this.timeout(20000);

            // Given
            initFixture(fixtureDir);

            // When
            const messages = uut.extractMessages({
              doc,
              type: fixture.type,
              query: fixture.query,
              doublefetchUrl: fixture.url,
            });

            // Then
            verifyFixtureExpectations(messages);
          });
        });
      });
    });
  });
