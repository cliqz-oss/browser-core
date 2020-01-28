/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */

require('../../../../../anolysis/unit/telemetry-schemas-test-helpers')({
  name: 'freshtab.analysis.interactions',
  schemas: [
    'freshtab/telemetry/metrics',
    'freshtab/telemetry/analyses/generic/interactions',
  ],
  tests: (generateAnalysisResults) => {
    it('generates no signal when no metric', async () => {
      chai.expect(await generateAnalysisResults({})).to.have.length(0);
    });

    it('aggregates all freshtab signals', async () => {
      const signals = await generateAnalysisResults({
        'freshtab.home.click.edit_favorite': [
          {
            type: 'home',
            action: 'click',
            target: 'edit_favorite',
          },
          {
            type: 'home',
            action: 'click',
            target: 'edit_favorite',
          },
        ],
        'freshtab.home.show': [
          {
            type: 'home',
            action: 'show',
          },
        ],
        'freshtab.home.click.settings.close': [
          {
            type: 'home',
            action: 'click',
            target: 'close',
            view: 'settings',
          },
        ],
      });
      chai.expect(signals).to.have.length(1);
      chai.expect(signals[0]).to.have.deep.members([
        {
          type: 'home',
          action: 'show',
          count: 1,
        },
        {
          type: 'home',
          action: 'click',
          target: 'edit_favorite',
          count: 2,
        },
        {
          type: 'home',
          action: 'click',
          view: 'settings',
          target: 'close',
          count: 1,
        },
      ]);
    });
  },
});
