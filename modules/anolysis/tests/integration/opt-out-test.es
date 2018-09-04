import {
  app,
  expect,
  waitForAsync,
  waitForPrefChange,
} from '../../core/test-helpers';

import getSynchronizedDate from '../../../core/synchronized-time';
import prefs from '../../../core/prefs';
import { isBootstrap } from '../../../core/platform';


export default function () {
  if (!isBootstrap) {
    return;
  }

  const today = getSynchronizedDate().format('YYYY-MM-DD');
  const anolysis = app.modules.anolysis.background;
  const pushTelemetry = (...args) => app.services.telemetry.api.push(...args);

  const clearTelemetryPrefs = () => {
    prefs.clear('telemetry');
    prefs.clear('uploadEnabled', 'datareporting.healthreport.');
  };

  context('opt-out from anolysis tests', function () {
    afterEach(() => clearTelemetryPrefs());

    [
      { telemetryEnabled: true, uploadEnabled: true, telemetryExpected: true },
      { telemetryEnabled: false, uploadEnabled: true, telemetryExpected: false },
      { telemetryEnabled: true, uploadEnabled: false, telemetryExpected: true },
      { telemetryEnabled: false, uploadEnabled: false, telemetryExpected: false },
    ].forEach(({ telemetryEnabled, uploadEnabled, telemetryExpected }) => {
      context(`telemetry: ${telemetryEnabled}, uploadEnabled: ${uploadEnabled} == ${telemetryExpected}`, function () {
        beforeEach(async () => {
          // Reset prefs to default
          clearTelemetryPrefs();
          await waitForAsync(() => anolysis.isAnolysisInitialized());

          // Reset Anolysis
          const anolysisVersionPrefChanged = waitForPrefChange('anolysisVersion');
          prefs.set('anolysisVersion', 0);
          await anolysisVersionPrefChanged;
          await app.disableModule('anolysis');
          await app.enableModule('anolysis');

          // Set telemetry prefs
          prefs.set('telemetry', telemetryEnabled);
          prefs.set('uploadEnabled', uploadEnabled, 'datareporting.healthreport.');
        });

        if (telemetryExpected) {
          it('enables Anolysis and accepts signals', async () => {
            // We expect Anolysis to be initialized by pref change
            await waitForAsync(() => anolysis.isAnolysisInitialized());

            await pushTelemetry({ active: false }, 'freshtab.prefs.state');
            expect((await anolysis.actions.getMetricsForDate(today))['freshtab.prefs.state']).to.have.length(1);
          });
        } else {
          it('disables Anolysis and rejects signals', async () => {
            // We expect Anolysis to be unloaded by pref change
            await waitForAsync(() => !anolysis.isAnolysisInitialized());

            try {
              await pushTelemetry({ active: false }, 'freshtab.prefs.state');
              throw new Error('pushTelemetry should have been rejected');
            } catch (ex) {
              /* We expect a rejection */
            }
          });
        }
      });
    });
  });
}
