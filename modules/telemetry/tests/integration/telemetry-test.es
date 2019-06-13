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
      await prefs.set('uploadEnabled', true, 'datareporting.healthreport.');
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
          await prefs.set('uploadEnabled', uploadEnabled, 'datareporting.healthreport.');
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
