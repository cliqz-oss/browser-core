import {
  CliqzUtils,
  expect,
  waitForPrefChange
} from '../test-helpers';

import prefs from '../../../core/prefs';
import { isFirefox } from '../../../core/platform';

export default function () {
  if (!isFirefox) {
    return;
  }

  context('telemetry tests', function () {
    afterEach(function () {
      prefs.clear('telemetry');
      prefs.clear('uploadEnabled', 'datareporting.healthreport.');
    });

    [
      { telemetry: true, uploadEnabled: true, telemetryExpected: true },
      { telemetry: false, uploadEnabled: true, telemetryExpected: false },
      { telemetry: true, uploadEnabled: false, telemetryExpected: true },
      { telemetry: false, uploadEnabled: false, telemetryExpected: false },
    ].forEach(({ telemetry, uploadEnabled, telemetryExpected }) => {
      context(`telemetry: ${telemetry}, uploadEnabled: ${uploadEnabled}`, function () {
        beforeEach(async function () {
          const p = waitForPrefChange('telemetry');
          prefs.set('telemetry', telemetry);
          // uploadEnabled is used for testing that it doesn't influence anything
          prefs.set('uploadEnabled', uploadEnabled, 'datareporting.healthreport.');
          await p;
          CliqzUtils.environment._trk = [];
          CliqzUtils.environment.telemetry({ test: 'test' });
        });

        if (telemetryExpected) {
          it('signal was pushed to environment._trk', function () {
            expect(CliqzUtils.environment._trk).to.have.length.above(0);
            expect(CliqzUtils.environment._trk[0]).to.have.property('test');
          });
        } else {
          it('signal was not pushed to environment._trk', function () {
            expect(CliqzUtils.environment._trk).to.have.length(0);
          });
        }
      });
    });
  });
}
