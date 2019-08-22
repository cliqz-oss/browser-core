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

export default describeModule('search/operators/responses/deduplicate',
  () => mock,
  () => {
    describe('#deduplicate', function () {
      let deduplicate;

      beforeEach(function () {
        deduplicate = this.module().deduplicate;
      });

      it('removes duplicate link from result', function () {
        const response = {
          results: [
            {
              links: [
                { meta: { url: 'cliqz.de', type: 'main' } },
                { meta: { url: 'ghostery.com', type: 'other' } },
              ],
            },
            {
              links: [
                { meta: { url: 'mozilla.org', type: 'main' } },
              ],
            },
          ],
          meta: {},
        };
        const duplicates = new Map([
          ['ghostery.com', undefined],
        ]);
        chai.expect(deduplicate(response, duplicates)).to.deep.equal({
          results: [
            {
              links: [
                { meta: { url: 'cliqz.de', type: 'main' } },
              ],
            },
            {
              links: [
                { meta: { url: 'mozilla.org', type: 'main' } },
              ],
            },
          ],
          meta: {},
        });
      });

      it('removes result if main link is removed', function () {
        const response = {
          results: [
            {
              links: [
                { meta: { url: 'cliqz.de', type: 'main' } },
                { meta: { url: 'ghostery.com', type: 'other' } },
              ],
            },
            {
              links: [
                { meta: { url: 'mozilla.org', type: 'main' } },
              ],
            },
          ],
          meta: {},
        };
        const duplicates = new Map([
          ['cliqz.de', undefined],
        ]);
        chai.expect(deduplicate(response, duplicates)).to.deep.equal({
          results: [
            {
              links: [
                { meta: { url: 'mozilla.org', type: 'main' } },
              ],
            },
          ],
          meta: {},
        });
      });
    });

    describe('#annotate', function () {
      let annotate;

      beforeEach(function () {
        annotate = this.module().annotate;
      });

      it('annotates link', function () {
        const response = {
          results: [
            {
              links: [
                { meta: { url: 'cliqz.de', type: 'main' }, kind: ['H'] },
              ],
            },
            {
              links: [
                { meta: { url: 'mozilla.org', type: 'main' }, kind: ['H'] },
              ],
            },
          ],
          meta: {},
        };
        const duplicates = new Map([
          ['cliqz.de', { kind: ['m'] }],
        ]);
        chai.expect(annotate(response, duplicates)).to.deep.equal({
          results: [
            {
              links: [
                { meta: { url: 'cliqz.de', type: 'main' }, kind: ['H', 'm'] },
              ],
            },
            {
              links: [
                { meta: { url: 'mozilla.org', type: 'main' }, kind: ['H'] },
              ],
            },
          ],
          meta: {},
        });
      });
    });
  });
