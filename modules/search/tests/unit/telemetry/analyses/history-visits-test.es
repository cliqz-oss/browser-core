/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */

require('../../../../anolysis/unit/telemetry-schemas-test-helpers')({
  name: 'analysis.history.visits.count',
  metrics: [
    'metrics.history.visits.count',
  ],
  schemas: [
    'search/telemetry/metrics/history-visits',
    'search/telemetry/analyses/history-visits',
  ],
  tests: (generateAnalysisResults) => {
    const visits = [
      {
        visitsCount: 1,
      },
      {
        visitsCount: 2,
      },
      {
        visitsCount: 3,
      },
    ];

    it('generates 0 signals if no telemetry was sent', () =>
      generateAnalysisResults({}).then(signals => chai.expect(signals).to.have.length(0)));

    it('shows correct visits count', () =>
      generateAnalysisResults({
        'metrics.history.visits.count': visits
      }).then(([first]) => chai.expect(first.count).to.equal(6)));

    it('shows null if count > 300', () => {
      const moreVisits = visits.concat({
        visitsCount: 300,
      });

      return generateAnalysisResults({
        'metrics.history.visits.count': moreVisits
      }).then(([first]) => chai.expect(first.count).to.equal(null));
    });
  },
});
