/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

const mock = {
  'search/operators/links/utils': {
    getMainLink: url => ({ url }),
  },
};

export default describeModule('search/operators/responses/smooth-responses',
  () => mock,
  () => {
    describe('#smoothResponses', function () {
      let smoothResponses;
      const config = {
        operators: {
          responses: {
            smoothResponses: {
              isEnabled: true,
            },
          },
        },
      };

      beforeEach(function () {
        smoothResponses = this.module().default;
      });

      it('keeps results that are in old but not in new reponse', function () {
        const oldResponse = {
          results: [
            'https://cliqz.com',
            'https://ghostery.com',
          ],
        };
        const newResponse = {
          results: [
            'https://cliqz.com',
          ],
        };

        const smoothedNewResponse = smoothResponses(oldResponse, newResponse, config);
        chai.expect(smoothedNewResponse.results).to.have.ordered.members([
          'https://cliqz.com',
          'https://ghostery.com',
        ]);
      });

      it('ignores missing old response', function () {
        const oldResponse = undefined;
        const newResponse = {
          results: [
            'https://cliqz.com',
          ],
        };

        const smoothedNewResponse = smoothResponses(oldResponse, newResponse, config);
        chai.expect(smoothedNewResponse.results).to.have.ordered.members([
          'https://cliqz.com',
        ]);
      });

      it('handles empty old response', function () {
        const oldResponse = { results: [] };
        const newResponse = {
          results: [
            'https://cliqz.com',
          ],
        };

        const smoothedNewResponse = smoothResponses(oldResponse, newResponse, config);
        chai.expect(smoothedNewResponse.results).to.have.ordered.members([
          'https://cliqz.com',
        ]);
      });

      it('handles empty new response', function () {
        const oldResponse = {
          results: [
            'https://cliqz.com',
          ],
        };
        const newResponse = { results: [] };

        const smoothedNewResponse = smoothResponses(oldResponse, newResponse, config);
        chai.expect(smoothedNewResponse.results).to.have.ordered.members([
          'https://cliqz.com',
        ]);
      });

      it('respects config', function () {
        config.operators.responses.smoothResponses.isEnabled = false;
        const oldResponse = {
          results: [
            'https://cliqz.com',
          ],
        };
        const newResponse = { results: [] };

        const smoothedNewResponse = smoothResponses(oldResponse, newResponse, config);
        chai.expect(smoothedNewResponse.results).to.be.empty;
      });
    });
  });
