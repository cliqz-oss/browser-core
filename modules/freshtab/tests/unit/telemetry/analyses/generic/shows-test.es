/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */

require('../../../../../anolysis/unit/telemetry-schemas-test-helpers')({
  name: 'freshtab.analysis.generic.shows',
  metrics: [
    'freshtab.home.show',
  ],
  schemas: [
    'freshtab/telemetry/metrics',
    'freshtab/telemetry/analyses/generic/shows',
  ],
  tests: (generateAnalysisResults) => {
    const test = async (count, check) => {
      const signals = await generateAnalysisResults({
        'freshtab.home.show': new Array(count).fill({}),
      });
      chai.expect(signals).to.have.length(1);
      return check(signals[0]);
    };

    it('counts no metrics as zero', () =>
      generateAnalysisResults().then(signals => chai.expect(signals).to.be.eql([{ total: 0 }])));

    it('counts single metric', () =>
      test(1, signal => chai.expect(signal).to.be.eql({ total: 1 })));

    it('counts multiple metric', () =>
      test(42, signal => chai.expect(signal).to.be.eql({ total: 42 })));
  },
});
