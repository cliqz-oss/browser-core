/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */

require('../telemetry-schemas-test-helpers')({
  name: 'analyses.freshtab.settings.background',
  metrics: [
    'freshtab.prefs.config'
  ],
  tests: (generateAnalysisResults) => {
    const test = async (config, check) => {
      const signals = await generateAnalysisResults({
        'freshtab.prefs.config': [config],
      });
      chai.expect(signals).to.have.length(1);
      check(signals[0]);
    };

    it('gets right defaults', () => test({ background: { index: 4 } },
      s => chai.expect(s).to.deep.equal({ index: 4 })));
  },
});
