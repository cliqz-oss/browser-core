/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* globals chai */

require('../../../../anolysis/unit/telemetry-schemas-test-helpers')({
  name: 'analysis.performance.general',
  metrics: [
    'metrics.performance.general',
  ],
  schemas: [
    'core/telemetry/metrics/performance',
    'core/telemetry/analyses/performance',
  ],
  tests: (generateAnalysisResults) => {
    it('generate nothing if no metric emitted', async () => {
      chai.expect(await generateAnalysisResults({})).to.have.length(0);
    });

    it('put out-of-range values to the extreme bins', async () => {
      chai.expect(await generateAnalysisResults({
        'metrics.performance.general': [
          { action: 'step1', ms: -1000 },
          { action: 'step1', ms: 1000 },
        ],
      })).to.be.eql([[
        { step: 'step1', histogram: { 0: 1, '70+': 1 } },
      ]]);
    });

    it('put extreme values to the extreme bins', async () => {
      chai.expect(await generateAnalysisResults({
        'metrics.performance.general': [
          { action: 'step1', ms: 0 },
          { action: 'step1', ms: 70 },
        ],
      })).to.be.eql([[
        { step: 'step1', histogram: { 0: 1, '70+': 1 } },
      ]]);
    });

    it('put one-before-extreme values to the one-before-extreme bins', async () => {
      chai.expect(await generateAnalysisResults({
        'metrics.performance.general': [
          { action: 'step1', ms: 1 },
          { action: 'step1', ms: 69 },
        ],
      })).to.be.eql([[
        { step: 'step1', histogram: { 1: 1, '60-69': 1 } },
      ]]);
    });

    it('put bin-middle values to theirs bins', async () => {
      chai.expect(await generateAnalysisResults({
        'metrics.performance.general': [
          { action: 'step1', ms: 13 },
          { action: 'step1', ms: 37 },
        ],
      })).to.be.eql([[
        { step: 'step1', histogram: { '10-14': 1, '30-39': 1 } },
      ]]);
    });

    it('put bin-bounds values to theirs bins', async () => {
      chai.expect(await generateAnalysisResults({
        'metrics.performance.general': [
          { action: 'step1', ms: 3 },
          { action: 'step1', ms: 5 },
          { action: 'step1', ms: 14 },
          { action: 'step1', ms: 30 },
          { action: 'step1', ms: 49 },
        ],
      })).to.be.eql([[
        { step: 'step1',
          histogram: {
            3: 1, '5-9': 1, '10-14': 1, '30-39': 1, '40-49': 1
          } },
      ]]);
    });

    it('accumulate in a bin', async () => {
      chai.expect(await generateAnalysisResults({
        'metrics.performance.general': [
          { action: 'step1', ms: 10 },
          { action: 'step1', ms: 11 },
          { action: 'step1', ms: 12 },
          { action: 'step1', ms: 13 },
          { action: 'step1', ms: 14 },
        ],
      })).to.be.eql([[
        { step: 'step1', histogram: { '10-14': 5 } },
      ]]);
    });

    it('create several actions', async () => {
      chai.expect(await generateAnalysisResults({
        'metrics.performance.general': [
          { action: 'step1', ms: 10 },
          { action: 'step2', ms: 11 },
          { action: 'step3', ms: 12 },
          { action: 'step1', ms: 13 },
          { action: 'step2', ms: 14 },
        ],
      })).to.be.eql([
        [{ step: 'step1', histogram: { '10-14': 2 } }],
        [{ step: 'step2', histogram: { '10-14': 2 } }],
        [{ step: 'step3', histogram: { '10-14': 1 } }],
      ]);
    });
  }
});
