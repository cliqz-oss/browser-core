/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */

require('../telemetry-schemas-test-helpers')({
  name: 'ui.analysis.interaction',
  schemas: [
    'anolysis/internals/internal-schemas',
  ],
  tests: (generateAnalysisResults) => {
    it('generates no signal when no metric', async () => {
      chai.expect(await generateAnalysisResults({})).to.have.length(0);
    });

    it('aggregates all interaction metrics', async () => {
      const signals = await generateAnalysisResults({
        'ui.metric.interaction': [
          {
            component: 'freshtab',
            action: 'click',
            target: 'edit_favorite',
          },
          {
            component: 'freshtab',
            action: 'click',
            target: 'edit_favorite',
          },
          {
            component: 'freshtab',
            action: 'show',
          },
          {
            component: 'freshtab',
            action: 'click',
            target: 'close',
            view: 'settings',
          },
        ],
      });

      chai.expect(signals).to.have.length(1);
      chai.expect(signals[0]).to.have.deep.members([
        {
          component: 'freshtab',
          action: 'show',
          count: 1,
        },
        {
          component: 'freshtab',
          action: 'click',
          target: 'edit_favorite',
          count: 2,
        },
        {
          component: 'freshtab',
          action: 'click',
          view: 'settings',
          target: 'close',
          count: 1,
        },
      ]);
    });
  },
});
