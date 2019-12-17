/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */

const test = require('../../../../anolysis/unit/telemetry-schemas-test-helpers');

test({
  name: 'antitracking.tokens.batches',
  metrics: [
    'metrics.antitracking.tokens.batch',
  ],
  schemas: [
    'antitracking/telemetry/metrics/tokens',
    'antitracking/telemetry/analyses/tokens',
  ],
  tests: (generateAnalysisResults) => {
    it('aggregates batch signals', async () => {
      const signals = await generateAnalysisResults({
        'metrics.antitracking.tokens.batch': [{
          source: 'keys',
          size: 3,
          toBeSentSize: 3,
          overflow: 0,
          messages: 4
        }, {
          source: 'tokens',
          size: 32,
          toBeSentSize: 10,
          overflow: 22,
          messages: 10
        }, {
          source: 'keys',
          size: 93,
          toBeSentSize: 90,
          overflow: 68,
          messages: 11
        }, {
          source: 'tokens',
          size: 22,
          toBeSentSize: 10,
          overflow: 12,
          messages: 10
        }, {
          source: 'keys',
          size: 68,
          toBeSentSize: 10,
          overflow: 0,
          messages: 5
        }]
      });
      chai.expect(signals).to.have.length(2);
      chai.expect(signals[0]).to.eql({
        source: 'tokens',
        batches: 2,
        size: {
          min: 22,
          max: 32,
          mean: 27,
          median: 27,
        },
        toBeSentSize: {
          min: 10,
          max: 10,
          mean: 10,
          median: 10,
        },
        overflow: {
          min: 12,
          max: 22,
          mean: 17,
          median: 17,
        },
        messages: {
          min: 10,
          max: 10,
          mean: 10,
          median: 10,
        },
      });
      chai.expect(signals[1]).to.eql({
        source: 'keys',
        batches: 3,
        size: {
          min: 3,
          max: 93,
          mean: 55,
          median: 68,
        },
        toBeSentSize: {
          min: 3,
          max: 90,
          mean: 34,
          median: 10,
        },
        overflow: {
          min: 0,
          max: 68,
          mean: 23,
          median: 0,
        },
        messages: {
          min: 4,
          max: 11,
          mean: 7,
          median: 5,
        },
      });
    });

    it('missing metrics', async () => {
      const signals = await generateAnalysisResults({
        'metrics.antitracking.tokens.batch': [{
          source: 'keys',
          size: 3,
          toBeSentSize: 3,
          overflow: 0,
          messages: 4
        }]
      });
      chai.expect(signals).to.have.length(1);
    });
  },
});

test({
  name: 'antitracking.tokens.cleaning',
  metrics: [
    'metrics.antitracking.tokens.clean',
  ],
  schemas: [
    'antitracking/telemetry/metrics/tokens',
    'antitracking/telemetry/analyses/tokens',
  ],
  tests: (generateAnalysisResults) => {
    it('aggregates batch signals', async () => {
      const signals = await generateAnalysisResults({
        'metrics.antitracking.tokens.clean': [{
          source: 'tokens',
          dbSize: 808,
          dbDelete: 0,
          cacheSize: 387,
          cacheDeleted: 20,
          processed: 0
        }, {
          source: 'keys',
          dbSize: 402,
          dbDelete: 0,
          cacheSize: 232,
          cacheDeleted: 27,
          processed: 0
        }, {
          source: 'tokens',
          dbSize: 811,
          dbDelete: 0,
          cacheSize: 379,
          cacheDeleted: 12,
          processed: 20
        }, {
          source: 'keys',
          dbSize: 402,
          dbDelete: 100,
          cacheSize: 168,
          cacheDeleted: 66,
          processed: 7
        }]
      });
      chai.expect(signals).to.have.length(2);
      chai.expect(signals[0]).to.eql({
        source: 'tokens',
        runs: 2,
        dbSize: 810,
        cacheSize: 383,
        dbDelete: { min: 0, max: 0, mean: 0, median: 0 },
        cacheDeleted: { min: 12, max: 20, mean: 16, median: 16 },
        processed: { min: 0, max: 20, mean: 10, median: 10 },
      });
      chai.expect(signals[1]).to.eql({
        source: 'keys',
        runs: 2,
        dbSize: 402,
        cacheSize: 200,
        dbDelete: { min: 0, max: 100, mean: 50, median: 50 },
        cacheDeleted: { min: 27, max: 66, mean: 47, median: 46.5 },
        processed: { min: 0, max: 7, mean: 4, median: 3.5 },
      });
    });

    it('missing metrics', async () => {
      const signals = await generateAnalysisResults({
        'metrics.antitracking.tokens.clean': [{
          source: 'tokens',
          dbSize: 808,
          dbDelete: 0,
          cacheSize: 387,
          cacheDeleted: 20,
          processed: 0
        }]
      });
      chai.expect(signals).to.have.length(1);
    });
  },
});
