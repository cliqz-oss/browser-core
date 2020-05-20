/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

function generateUrlVariations(base, cb) {
  const protocols = ['', 'http:', 'https://', 'http:///'];
  const wwws = ['', 'www.', 'www2.'];
  const mobiles = ['', 'mobile.', 'm.', 'mobil.'];

  protocols.forEach((protocol) => {
    wwws.forEach((www) => {
      mobiles.forEach((mobile) => {
        cb(`${protocol}${www}${mobile}${base}`);
      });
    });
  });
}

export default describeModule('search/operators/streams/add-completion-to-results',
  () => ({
    'rxjs/operators': {},
  }),
  () => {
    describe('#getCompletion', () => {
      let getCompletion;
      const defaultOptions = { useTitle: true, maxTitleLength: undefined };
      const complete = ({ query, url, title, options = defaultOptions }) => getCompletion(
        query,
        { url, title },
        options,
      );

      beforeEach(function () {
        getCompletion = this.module().getCompletion;
      });

      describe('title', () => {
        it('completes with title as a fallback', () => {
          chai.expect(complete({
            query: 'desc',
            url: 'https://example.com',
            title: 'description',
          })).to.eql('ription — https://example.com');
        });

        it('does not use stripped query', () => {
          chai.expect(complete({
            query: 'about:desc',
            url: 'https://example.com',
            title: 'description',
          })).to.eql('');
        });

        it('complete with leading spaces', () => {
          chai.expect(complete({
            query: '  about:desc',
            url: 'https://example.com',
            title: 'description',
          })).to.eql('');
        });

        it('does not complete when query looks like a URL', () => {
          chai.expect(complete({
            query: 'about:deb',
            url: 'https://example.com',
            title: 'about:debbugging',
          })).to.eql('');
        });
      });

      describe('link', () => {
        describe('returns empty completion', () => {
          [
            ['', 'http://example.com', ''], // empty query
            ['query', '', ''], // empty url
            ['url', 'url', ''], // query === url
            ['http:url', 'https:url', ''], // stripped query === stripped url
            ['url', 'https:url', ''], // query === stripped url
            ['http:url', 'url', ''], // stripped query === url
            ['https:////www.mobile.url', 'url', ''], // stripped query === url
          ].forEach(([query, url, completion]) => {
            it(`q=${query} with ${url} completes to ${completion}`, () => {
              chai.expect(complete({ query, url })).to.eql(completion);
            });
          });
        });

        describe('completes when protocols are compatible', () => {
          [
            ['http:a', 'https://addons.mozilla.org', 'ddons.mozilla.org'],
            ['http:d', 'http://debugging', 'ebugging'],
            ['about:d', 'about:debugging', 'ebugging'],
          ].forEach(([query, url, completion]) => {
            it(`q=${query} with ${url} completes to ${completion}`, () => {
              chai.expect(complete({ query, url })).to.eql(completion);
            });
          });
        });

        describe('does not complete incompatible protocols', () => {
          [
            ['about:', 'https://addons.mozilla.org', ''],
            ['about:a', 'https://addons.mozilla.org', ''],
          ].forEach(([query, url, completion]) => {
            it(`q=${query} with ${url} completes to ${completion}`, () => {
              chai.expect(complete({ query, url })).to.eql(completion);
            });
          });
        });

        it('completes when query and URL have different protocols', () => {
          chai.expect(complete({
            query: 'http://foo',
            url: 'https:///foo.com',
          })).to.eql('.com');
        });

        it('does not complete empty stripped query', () => {
          chai.expect(complete({
            query: 'http:',
            url: 'https:///foo.com',
          })).to.eql('');
        });

        describe('url starts with query', () => {
          [
            ['h', 'https://example.com', ''],
            ['ht', 'https://example.com', ''],
            ['htt', 'https://example.com', ''],
            ['http', 'https://example.com', ''],
            ['https', 'https://example.com', ''],
            ['https:', 'https://example.com', ''],
            ['https:/', 'https://example.com', ''],
            ['https://', 'https://example.com', ''],
            ['https://e', 'https://example.com', 'xample.com'],
            ['https://ex', 'https://example.com', 'ample.com'],
            ['https://exa', 'https://example.com', 'mple.com'],
            ['https://exam', 'https://example.com', 'ple.com'],
            ['https://examp', 'https://example.com', 'le.com'],
            ['https://exampl', 'https://example.com', 'e.com'],
            ['https://example', 'https://example.com', '.com'],
            ['https://example.', 'https://example.com', 'com'],
            ['https://example.c', 'https://example.com', 'om'],
            ['https://example.co', 'https://example.com', 'm'],
          ].forEach(([query, url, completion]) => {
            it(`q=${query} with ${url} completes to ${completion}`, () => {
              chai.expect(complete({ query, url })).to.eql(completion);
            });
          });
        });

        describe('url starts with stripped query', () => {
          const url = 'example.com';
          const baseQuery = 'ex';
          const completion = 'ample.com';
          generateUrlVariations(baseQuery, (query) => {
            it(`q=${query} with ${url} completes to ${completion}`, () => {
              chai.expect(complete({ query, url })).to.eql(completion);
            });
          });
        });

        describe('stripped url starts with query', () => {
          const baseUrl = 'example.com';
          const query = 'ex';
          const completion = 'ample.com';
          generateUrlVariations(baseUrl, (url) => {
            it(`q=${query} with ${url} completes to ${completion}`, () => {
              chai.expect(complete({ query, url })).to.eql(completion);
            });
          });
        });

        it('stripped url starts with stripped query', () => {
          chai.expect(complete({
            query: 'https:////www2.m.ex',
            url: 'http:www.mobile.example.com/',
          })).to.eql('ample.com');
        });

        it('completion is case-insensitive', () => {
          chai.expect(complete({
            query: 'hTTps:////wwW2.m.ex',
            url: 'http:www.mobile.EXample.com/',
          })).to.eql('ample.com');
        });

        it('completion ignores leading spaces', () => {
          chai.expect(complete({
            query: ' \t\r\nhTTps:////wwW2.m.ex',
            url: 'http:www.mobile.EXample.com/',
          })).to.eql('ample.com');
        });
      });
    });
  });
