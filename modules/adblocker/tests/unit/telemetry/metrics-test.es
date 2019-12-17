/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */

let adblockerActionResult = Promise.resolve(true);

require('../../../anolysis/unit/telemetry-schemas-test-helpers')({
  name: 'metrics.adblocker.enabled',
  metrics: [],
  schemas: ['adblocker/telemetry/metrics'],
  mock: {
    'core/kord/inject': {
      default: {
        module() {
          return {
            isEnabled: () => true,
            async action(action) {
              if (action === 'isEnabled') {
                return adblockerActionResult;
              }

              return Promise.reject(new Error(`No such action: ${action}`));
            },
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
      adblockerActionResult = Promise.resolve(true);
      return test(signal => chai.expect(signal).to.be.eql({ enabled: true }));
    });

    it('disabled', () => {
      adblockerActionResult = Promise.resolve(false);
      return test(signal => chai.expect(signal).to.be.eql({ enabled: false }));
    });

    it('disabled (field missing)', () => {
      adblockerActionResult = Promise.resolve(undefined);
      return test(signal => chai.expect(signal).to.be.eql({ enabled: false }));
    });

    it('adblocker not reachable', () => {
      adblockerActionResult = Promise.reject();
      return test(signal => chai.expect(signal).to.be.eql({ enabled: false }));
    });
  },
});
