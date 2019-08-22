/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

const mock = {
};

export default describeModule('search/operators/links/utils',
  () => mock,
  () => {
    describe('#mapLinksByUrl', function () {
      let mapLinksByUrl;

      beforeEach(function () {
        mapLinksByUrl = this.module().mapLinksByUrl;
      });

      it('maps empty links', function () {
        chai.expect(mapLinksByUrl([])).to.be.empty;
      });

      it('maps 1 URL', function () {
        const links = [{
          kind: ['m'],
          meta: { url: 'cliqz.de' },
        }];
        const map = mapLinksByUrl(links);
        chai.expect(map).to.have.key('cliqz.de');
        chai.expect(map.get('cliqz.de')).to.deep.equal(links[0]);
      });

      it('maps multiple URLs', function () {
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
        const map = mapLinksByUrl(links);
        chai.expect(map).to.have.keys('cliqz.de', 'ghostery.com', 'mozilla.org');
        chai.expect(map.get('cliqz.de')).to.deep.equal(links[0]);
        chai.expect(map.get('ghostery.com')).to.deep.equal(links[1]);
        chai.expect(map.get('mozilla.org')).to.deep.equal(links[2]);
      });
    });
    describe('#getDuplicateLinks', function () {
      let getDuplicateLinks;

      beforeEach(function () {
        getDuplicateLinks = this.module().getDuplicateLinks;
      });

      it('works with empty links', function () {
        chai.expect(getDuplicateLinks([], [])).to.be.empty;
        chai.expect(getDuplicateLinks([{ meta: { url: 'cliqz.com' } }], [])).to.be.empty;
        chai.expect(getDuplicateLinks([], [{ meta: { url: 'cliqz.com' } }])).to.be.empty;
      });

      it('gets duplicates from target links with exact url match', function () {
        const link1 = { kind: ['a'], meta: { url: 'cliqz.com' } };
        const link2 = { kind: ['b'], meta: { url: 'cliqz.com' } };
        const link3 = { kind: ['c'], meta: { url: 'ghostery.com' } };
        chai.expect(getDuplicateLinks([link1], [link2, link3])).to.deep.equal([link1]);
      });

      describe('no duplicates when links do not match exactly', function () {
        context('tlds are different', function () {
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
            it(`${domain} has no duplicates`, function () {
              const cliqz = [];
              const history = [];
              testCases[domain].cliqz.forEach((url) => {
                cliqz.push({ kind: ['a'], meta: { url } });
              });
              testCases[domain].history.forEach((url) => {
                history.push({ kind: ['a'], meta: { url } });
              });
              const duplicates = this.module().getDuplicateLinks(cliqz, history);
              chai.expect(duplicates).to.be.empty;
            });
          });
        });

        context('subdomains are different', function () {
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
            it(`${domain} has no duplicates`, function () {
              const cliqz = [];
              const history = [];
              testCases[domain].cliqz.forEach((url) => {
                cliqz.push({ kind: ['a'], meta: { url } });
              });
              testCases[domain].history.forEach((url) => {
                history.push({ kind: ['a'], meta: { url } });
              });
              const duplicates = this.module().getDuplicateLinks(cliqz, history);
              chai.expect(duplicates).to.be.empty;
            });
          });
        });
      });
    });
    describe('#hasMainLink', function () {
      let hasMainLink;

      beforeEach(function () {
        hasMainLink = this.module().hasMainLink;
      });

      it('works with empty links', function () {
        chai.expect(hasMainLink({ links: [] })).to.be.false;
      });

      it('returns true if there is a main link', function () {
        chai.expect(hasMainLink({ links: [
          { meta: { type: 'main' } },
        ] })).to.be.true;
        chai.expect(hasMainLink({ links: [
          { meta: { type: 'main' } },
          { meta: { type: 'other' } },
        ] })).to.be.true;
      });

      it('returns false if there is no main link', function () {
        chai.expect(hasMainLink({ links: [
          { meta: { type: 'other' } },
        ] })).to.be.false;
      });
    });
    describe('#convertAndRevertHistoryLink', function () {
      let convertMainLinkToHistorySubLink;
      let revertHistorySubLinkToMainLink;

      const mainLink = {
        url: 'https://cliqz.com',
        kind: ['A', 'B'],
        provider: 'history',
        text: 'cliqz',
        meta: {
          type: 'main',
          level: 0,
          subType: {},
        }
      };

      const subLink = {
        url: 'https://cliqz.com',
        kind: ['C', 'A', 'B'],
        provider: 'history',
        text: 'cliqz',
        meta: {
          type: 'history',
          level: 1,
          subType: {},
        }
      };

      beforeEach(function () {
        convertMainLinkToHistorySubLink = this.module().convertMainLinkToHistorySubLink;
        revertHistorySubLinkToMainLink = this.module().revertHistorySubLinkToMainLink;
      });

      it('convert main link to sub-link correctly', function () {
        chai.expect(convertMainLinkToHistorySubLink(mainLink)).to.deep.equal(subLink);
      });

      it('revert sub-link to main link correctly', function () {
        chai.expect(revertHistorySubLinkToMainLink(subLink)).to.deep.equal(mainLink);
      });
    });
  });
