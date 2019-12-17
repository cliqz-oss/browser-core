/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */

require('../../../../../anolysis/unit/telemetry-schemas-test-helpers')({
  name: 'news-pagination',
  metrics: [
    'freshtab.home.click.news_pagination',
  ],
  schemas: [
    'freshtab/telemetry/metrics',
    'freshtab/telemetry/analyses/news/pagination',
  ],
  tests: (generateAnalysisResults) => {
    const test = async (indices, check) => {
      const signals = await generateAnalysisResults({
        'freshtab.home.click.news_pagination': indices.map(index => ({ index })),
      });
      chai.expect(signals).to.have.length(1);
      return check(signals[0]);
    };

    it('has empty histogram with no pagination interaction', () =>
      generateAnalysisResults().then(signals => chai.expect(signals).to.have.length(0)));

    it('computes histogram with one entry', () =>
      test([0, 0], signal => chai.expect(signal).to.be.eql({ clicks: [2] })));

    it('computes histogram with sparse entries', () =>
      test([0, 0, 2], signal => chai.expect(signal).to.be.eql({ clicks: [2, 0, 1] })));
  },
});
