/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */

let freshtTabActionResult = true;

require('../telemetry-schemas-test-helpers')({
  name: 'metrics.freshtab.state',
  metrics: [],
  mock: {
    'core/kord/inject': {
      default: {
        module() {
          return {
            isEnabled: () => freshtTabActionResult,
          };
        },
      },
    },
  },
  tests: (generateAnalysisResults) => {
    const test = async (check) => {
      const signals = await generateAnalysisResults({});
      chai.expect(signals).to.have.length(1);
      check(signals[0]);
    };

    it('enabled', () => {
      freshtTabActionResult = true;
      return test(signal => chai.expect(signal).to.be.eql({ is_freshtab_on: true }));
    });

    it('disabled', () => {
      freshtTabActionResult = false;
      return test(signal => chai.expect(signal).to.be.eql({ is_freshtab_on: false }));
    });
  },
});
