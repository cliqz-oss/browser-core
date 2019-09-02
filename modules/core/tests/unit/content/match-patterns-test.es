/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

export default describeModule('core/content/match-patterns',
  () => ({}),
  () => {
    describe('#match', () => {
      let match;

      beforeEach(function () {
        match = this.module().default;
      });

      [
        {
          pattern: '<all_urls>',
          matches: [
            'http://example.org/',
            'https://a.org/some/path/',
            'ws://sockets.somewhere.org/',
            'wss://ws.example.com/stuff/',
            'ftp://files.somewhere.org/',
            'ftps://files.somewhere.org/',
          ],
          nonMatches: ['resource://a/b/c/'],
        },
        {
          pattern: '*://*/*',
          matches: [
            'http://example.org/',
            'https://a.org/some/path/',
            'ws://sockets.somewhere.org/',
            'wss://ws.example.com/stuff/',
          ],
          nonMatches: ['ftp://ftp.example.org/', 'ftps://ftp.example.org/', 'file:///a/'],
        },
        {
          pattern: '*://*.mozilla.org/*',
          matches: [
            'http://mozilla.org/',
            'https://mozilla.org/',
            'http://a.mozilla.org/',
            'http://a.b.mozilla.org/',
            'https://b.mozilla.org/path/',
            'ws://ws.mozilla.org/',
            'wss://secure.mozilla.org/something',
          ],
          nonMatches: ['ftp://mozilla.org/', 'http://mozilla.com/', 'http://firefox.org/'],
        },
        {
          pattern: '*://mozilla.org/',
          matches: [
            'http://mozilla.org/',
            'https://mozilla.org/',
            'ws://mozilla.org/',
            'wss://mozilla.org/',
          ],
          nonMatches: ['ftp://mozilla.org/', 'http://a.mozilla.org/', 'http://mozilla.org/a'],
        },
        {
          pattern: 'ftp://mozilla.org/',
          matches: ['ftp://mozilla.org', 'ftp://mozilla.org/'],
          nonMatches: ['http://mozilla.org/', 'ftp://sub.mozilla.org/', 'ftp://mozilla.org/path'],
        },
        {
          pattern: 'https://*/path',
          matches: [
            'https://mozilla.org/path',
            'https://a.mozilla.org/path',
            'https://something.com/path',
          ],
          nonMatches: [
            'http://mozilla.org/path',
            'https://mozilla.org/path/',
            'https://mozilla.org/a',
            'https://mozilla.org/',
            'https://mozilla.org/path?foo=1',
          ],
        },
        {
          pattern: 'https://*/path/',
          matches: [
            'https://mozilla.org/path/',
            'https://a.mozilla.org/path/',
            'https://something.com/path/',
          ],
          nonMatches: [
            'http://mozilla.org/path/',
            'https://mozilla.org/path',
            'https://mozilla.org/a',
            'https://mozilla.org/',
            'https://mozilla.org/path/?foo=1',
          ]
        },
        {
          pattern: 'https://mozilla.org/*',
          matches: [
            'https://mozilla.org/',
            'https://mozilla.org/path',
            'https://mozilla.org/another',
            'https://mozilla.org/path/to/doc',
            'https://mozilla.org/path/to/doc?foo=1',
          ],
          nonMatches: [
            'http://mozilla.org/path',
            'https://mozilla.com/path',
          ],
        },
        {
          pattern: 'https://mozilla.org/a/b/c/',
          matches: [
            'https://mozilla.org/a/b/c/',
            'https://mozilla.org/a/b/c/#section1',
          ],
          nonMatches: [
            'https://mozilla.org/a/b/c/d',
            'https://mozilla.org/a/b/c?query',
            'https://mozilla.org/a/b/c/?query',
          ],
        },
        {
          pattern: 'https://mozilla.org/*/b/*/',
          matches: [
            'https://mozilla.org/a/b/c/',
            'https://mozilla.org/d/b/f/',
            'https://mozilla.org/a/b/c/d/',
            'https://mozilla.org/a/b/c/d/#section1',
            'https://mozilla.org/a/b/c/d/?foo=/',
            'https://mozilla.org/a?foo=21314&bar=/b/&extra=c/',
          ],
          nonMatches: [
            'https://mozilla.org/b/*/',
            'https://mozilla.org/a/b/',
            'https://mozilla.org/a/b/c/d/?foo=bar',
          ],
        },
        {
          pattern: 'file:///blah/*',
          matches: [
            'file:///blah/',
            'file:///blah/bleh',
          ],
          nonMatches: [
            'file:///bleh/',
          ],
        }
      ].forEach(({ pattern, matches, nonMatches }) => {
        matches.forEach((url) => {
          it(`${pattern} matches ${url}`, () => {
            chai.expect(match(pattern, url)).to.be.true;
          });
        });

        nonMatches.forEach((url) => {
          it(`${pattern} *does not* matches ${url}`, () => {
            chai.expect(match(pattern, url)).to.be.false;
          });
        });
      });

      // // Invalid patterns
      [
        'resource://path/',
        'https://mozilla.org',
        'https://mozilla.*.org/',
        'https://*zilla.org/',
        'http*://mozilla.org/',
        'https://mozilla.org:80/',
        '*://*',
        'file://*',
      ].forEach((pattern) => {
        it(`parsing ${pattern} should throw`, () => {
          chai.expect(() => match(pattern, 'https://examples.com')).to.throw();
        });
      });
    });
  });
