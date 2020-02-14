/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */


const mock = {};

export default describeModule('search/operators/responses/annotate-tabs',
  () => mock,
  () => {
    describe('#annotateTabs', function () {
      let annotateTabs;

      beforeEach(function () {
        annotateTabs = this.module().default;
      });

      it('should annotate history URLs also present in tabs response', function () {
        const historyResponse = {
          foo: {
            bar: 0,
          },
          results: [
            {
              foo: 0,
              links: [
                {
                  foo: 0,
                  url: 'https://cliqz.com',
                  style: '',
                  type: '',
                },
                {
                  foo: 0,
                  url: 'www.ghostery.com',
                  style: '',
                  type: '',
                },
                {
                  foo: 0,
                  url: 'https://www.whotracks.me',
                  style: '',
                  type: '',
                },
              ]
            },
            {
              foo: 0,
              links: [
                {
                  foo: 0,
                  url: 'lumenbrowser.com',
                  style: '',
                  type: '',
                },
              ]
            }
          ]
        };

        const tabsResponse = {
          results: [
            {
              links: [
                {
                  url: 'https://cliqz.com',
                },
                {
                  url: 'lumenbrowser.com',
                },
              ]
            },
            {
              links: [
                {
                  url: 'https://www.whotracks.me',
                }
              ]
            }
          ],
        };

        const expectedResponse = {
          foo: {
            bar: 0,
          },
          results: [
            {
              foo: 0,
              links: [
                {
                  foo: 0,
                  url: 'https://cliqz.com',
                  style: 'action switchtab',
                  type: 'action switchtab',
                },
                {
                  foo: 0,
                  url: 'www.ghostery.com',
                  style: '',
                  type: '',
                },
                {
                  foo: 0,
                  url: 'https://www.whotracks.me',
                  style: 'action switchtab',
                  type: 'action switchtab',
                },
              ]
            },
            {
              foo: 0,
              links: [
                {
                  foo: 0,
                  url: 'lumenbrowser.com',
                  style: 'action switchtab',
                  type: 'action switchtab',
                },
              ]
            }
          ]
        };

        chai.expect(annotateTabs([historyResponse, tabsResponse]))
          .to.deep.equal(expectedResponse);
      });
    });
  });
