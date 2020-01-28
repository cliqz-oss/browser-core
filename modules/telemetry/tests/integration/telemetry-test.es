/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  app,
  expect,
  prefs,
} from '../../../tests/core/test-helpers';

import inject from '../../../core/kord/inject';

export default function () {
  context('telemetry tests', function () {
    afterEach(async function () {
      prefs.clear('telemetry');
      await inject.service('host-settings', ['set']).set('datareporting.healthreport.uploadEnabled', true);
    });

    [
      { telemetryEnabled: true, uploadEnabled: true, telemetryExpected: true },
      { telemetryEnabled: false, uploadEnabled: true, telemetryExpected: false },
      { telemetryEnabled: true, uploadEnabled: false, telemetryExpected: !chrome.cliqz },
      { telemetryEnabled: false, uploadEnabled: false, telemetryExpected: false },
    ].forEach(({ telemetryEnabled, uploadEnabled, telemetryExpected }) => {
      context(`telemetry: ${telemetryEnabled}, uploadEnabled: ${uploadEnabled}`, function () {
        let telemetryModule;

        beforeEach(async function () {
          telemetryModule = app.modules.telemetry.background;
          await inject.service('host-settings', ['set']).set('datareporting.healthreport.uploadEnabled', uploadEnabled);
          prefs.set('telemetry', telemetryEnabled);

          await inject.service('telemetry', ['verifyStatus']).verifyStatus();
          telemetryModule.trk = [];

          // Use telemetry service, which checks for telemetry enabled and private mode.
          await inject.service('telemetry', ['push']).push({ test: 'test' });
        });

        if (telemetryExpected) {
          it('signal was pushed to environment.trk', function () {
            expect(telemetryModule.trk).to.have.length.above(0);
            expect(telemetryModule.trk[0]).to.have.property('test');
          });
        } else {
          it('signal was not pushed to environment.trk', function () {
            expect(telemetryModule.trk).to.have.length(0);
          });
        }
      });
    });
  });
}
