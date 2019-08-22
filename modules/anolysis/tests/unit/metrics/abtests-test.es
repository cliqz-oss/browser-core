/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */

let legacyMocks = null;

require('../telemetry-schemas-test-helpers')({
  name: 'metrics.core.abtests',
  mock: {
    'core/prefs': {
      default: {
        get(p, def) {
          if (p === 'ABTests') { return legacyMocks; }
          return def;
        },
        set() {},
        has() { return false; },
      },
    },
  },
  tests: (generateAnalysisResults) => {
    [
      { abtests: JSON.stringify({}), result: [] },
      { abtests: undefined, result: [] },
      { abtests: null, result: [] },
      { abtests: 42, result: [] },
      { abtests: JSON.stringify({ '10_A': {} }), result: [{ id: 10, group: 'A' }] },
      { abtests: JSON.stringify({ '10_A': [] }), result: [{ id: 10, group: 'A' }] },
      { abtests: JSON.stringify({ '10_A': 42 }), result: [{ id: 10, group: 'A' }] },
      { abtests: JSON.stringify({ '10_A': {}, '11_B': {}, '12_C': {} }),
        result: [{ id: 10, group: 'A' }, { id: 11, group: 'B' }, { id: 12, group: 'C' }] },
    ].forEach(({ abtests, result }) => {
      it(`parses legacy ${abtests}`, async () => {
        legacyMocks = abtests;
        chai.expect(await generateAnalysisResults()).to.be.eql([result]);
      });
    });
  },
});
