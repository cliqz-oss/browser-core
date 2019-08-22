/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

const mock = {
  'core/url': {},
};

export default describeModule('search/operators/results/utils',
  () => mock,
  () => {
    describe('#flattenLinks', function () {
      let flattenLinks;

      beforeEach(function () {
        flattenLinks = this.module().flattenLinks;
      });

      it('flattens empty results', function () {
        const results = [];
        chai.expect(flattenLinks(results)).to.be.empty;
      });

      it('flattens result with empty links', function () {
        const results = [{ links: [] }];
        chai.expect(flattenLinks(results)).to.be.empty;
      });

      it('flattens 1 result with 1 URL', function () {
        const links = [{
          kind: ['m'],
          meta: { url: 'cliqz.de' },
        }];
        const results = [{ links }];
        const flattened = flattenLinks(results);
        chai.expect(flattened).to.deep.equal(links);
      });

      it('flattens 1 result with multiple URLs', function () {
        const links = [
          {
            kind: ['m'],
            meta: { url: 'cliqz.de' },
          },
          {
            kind: ['m'],
            meta: { url: 'ghostery.com' },
          },
        ];
        const results = [{ links }];
        const flattened = flattenLinks(results);
        chai.expect(flattened).to.deep.equal(links);
      });

      it('flattens multiple results with 1 URL', function () {
        const links = [
          {
            kind: ['m'],
            meta: { url: 'cliqz.de' },
          },
          {
            kind: ['m'],
            meta: { url: 'ghostery.com' },
          },
        ];
        const results = [{ links: [links[0]] }, { links: [links[1]] }];
        const flattened = flattenLinks(results);
        chai.expect(flattened).to.deep.equal(links);
      });

      it('flattens multiple results with multiple URLs', function () {
        const links = [
          {
            kind: ['m'],
            meta: { url: 'cliqz.de' },
          },
          {
            kind: ['m'],
            meta: { url: 'ghostery.com' },
          },
          {
            kind: ['m'],
            meta: { url: 'mozilla.org' },
          },
        ];
        const results = [{ links: [links[0]] }, { links: [links[1], links[2]] }];
        const flattened = flattenLinks(results);
        chai.expect(flattened).to.deep.equal(links);
      });
    });
    describe('#getDuplicateLinksByUrl', function () {
      let getDuplicateLinksByUrl;

      beforeEach(function () {
        getDuplicateLinksByUrl = this.module().getDuplicateLinksByUrl;
      });

      context('exact url match', function () {
        it('finds and maps duplicate', function () {
          const link1 = { meta: { url: 'cliqz.de' }, kind: ['a'] };
          const link2 = { meta: { url: 'cliqz.de' }, kind: ['b'] };
          const results1 = [
            { links: [link1] },
          ];
          const results2 = [
            { links: [link2] },
          ];
          const map = getDuplicateLinksByUrl(results1, results2);
          chai.expect(map).to.have.key(link1.meta.url);
          chai.expect(map.get(link1.meta.url)).to.deep.equal(link1);
        });
      });

      context('not exact url match', function () {
        describe('tlds are different', function () {
          const testCases = {
            Facebook: {
              cliqz: ['facebook.com', 'cliqz.com'],
              history: ['facebook.de']
            },
            Amazon: {
              cliqz: ['amazon.com', 'cliqz.com'],
              history: ['amazon.de']
            },
            Wikipedia: {
              cliqz: ['wikipedia.com', 'cliqz.com'],
              history: ['wikipedia.de']
            },
            Google: {
              cliqz: ['google.com', 'cliqz.com'],
              history: ['google.de']
            }
          };

          Object.keys(testCases).forEach((domain) => {
            it(`${domain} finds no duplicates`, function () {
              const cliqz = [];
              const history = [];
              testCases[domain].cliqz.forEach((url) => {
                const link = { meta: { url }, kind: ['a'] };
                cliqz.push({ links: [link] });
              });

              testCases[domain].history.forEach((url) => {
                const link = { meta: { url }, kind: ['a'] };
                history.push({ links: [link] });
              });
              const map = getDuplicateLinksByUrl(cliqz, history);
              chai.expect(map).to.be.empty;
            });
          });
        });

        describe('subdomains are different', function () {
          const testCases = {
            Facebook: {
              cliqz: ['www.facebook.com', 'cliqz.com'],
              history: ['de-de.facebook.com']
            },
            Amazon: {
              cliqz: ['amazon.com', 'cliqz.com'],
              history: ['console.aws.amazon.com']
            },
            Wikipedia: {
              cliqz: ['en.wikipedia.org', 'cliqz.com'],
              history: ['de.wikipedia.org']
            },
            Google: {
              cliqz: ['maps.google.com', 'cliqz.com'],
              history: ['mail.google.com']
            }
          };

          Object.keys(testCases).forEach((domain) => {
            it(`${domain} finds no duplicates`, function () {
              const cliqz = [];
              const history = [];
              testCases[domain].cliqz.forEach((url) => {
                const link = { meta: { url }, kind: ['a'] };
                cliqz.push({ links: [link] });
              });

              testCases[domain].history.forEach((url) => {
                const link = { meta: { url }, kind: ['a'] };
                history.push({ links: [link] });
              });
              const map = getDuplicateLinksByUrl(cliqz, history);
              chai.expect(map).to.be.empty;
            });
          });
        });
      });
    });
  });
