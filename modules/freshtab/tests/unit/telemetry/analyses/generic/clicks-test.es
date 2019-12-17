/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */

require('../../../../../anolysis/unit/telemetry-schemas-test-helpers')({
  name: 'freshtab.analysis.generic.clicks',
  metrics: [
    'freshtab.home.click.topsite',
    'freshtab.home.click.favorite',
    'freshtab.home.click.breakingnews',
    'freshtab.home.click.topnews',
    'freshtab.home.click.yournews',
    'freshtab.home.click.history',
    'freshtab.home.click.settings',
    'freshtab.home.click.add_favorite',
    'freshtab.home.click.edit_favorite',
    'freshtab.home.click.news_pagination',
  ],
  schemas: [
    'freshtab/telemetry/metrics',
    'freshtab/telemetry/analyses/generic/clicks',
  ],
  tests: (generateAnalysisResults) => {
    const test = async (targets, check) => {
      const metrics = {};
      targets.forEach((target) => {
        const metricName = `freshtab.home.click.${target}`;
        if (metrics[metricName] === undefined) {
          metrics[metricName] = [];
        }
        metrics[metricName].push({
          type: 'home',
          action: 'click',
          target,
        });
      });
      const signals = await generateAnalysisResults(metrics);
      chai.expect(signals).to.have.length(1);
      return check(signals[0]);
    };

    it('counts no metrics as zero with empty targets', () =>
      generateAnalysisResults().then(signals =>
        chai.expect(signals).to.be.eql([{ total: 0, targets: {} }])));

    it('counts all metrics', () =>
      test([
        'topsite',
        'favorite',
        'breakingnews',
        'topnews',
        'yournews',
        'history',
        'settings',
        'add_favorite',
        'edit_favorite',
        'news_pagination',
      ], signal => chai.expect(signal).to.be.eql({
        total: 10,
        targets: {
          topsite: 1,
          favorite: 1,
          breakingnews: 1,
          topnews: 1,
          yournews: 1,
          history: 1,
          settings: 1,
          add_favorite: 1,
          edit_favorite: 1,
          news_pagination: 1
        },
      })));

    it('counts some metrics', () =>
      test([
        'topsite',
        'favorite',
        'topsite',
        'topsite',
      ], signal => chai.expect(signal).to.be.eql({
        total: 4,
        targets: {
          topsite: 3,
          favorite: 1,
        },
      })));
  },
});
