import {
  app,
  expect,
  waitFor,
  waitForPrefChange,
} from '../../core/integration/helpers';

import getSynchronizedDate from '../../../core/synchronized-time';
import prefs from '../../../core/prefs';
import { isBootstrap } from '../../../core/platform';


export default function () {
  if (!isBootstrap) {
    return;
  }

  const today = getSynchronizedDate().format('YYYY-MM-DD');
  const anolysis = app.modules.anolysis.background;

  const clearTelemetryPrefs = () => {
    prefs.clear('telemetry');
    prefs.clear('uploadEnabled', 'datareporting.healthreport.');
  };

  context('opt-out from anolysis tests', function () {
    let pushTelemetry;
    afterEach(() => clearTelemetryPrefs());

    [
      { telemetryEnabled: true, uploadEnabled: true, telemetryExpected: true },
      { telemetryEnabled: false, uploadEnabled: true, telemetryExpected: false },
      { telemetryEnabled: true, uploadEnabled: false, telemetryExpected: true },
      { telemetryEnabled: false, uploadEnabled: false, telemetryExpected: false },
    ].forEach(({ telemetryEnabled, uploadEnabled, telemetryExpected }) => {
      context(`telemetry: ${telemetryEnabled}, uploadEnabled: ${uploadEnabled} == ${telemetryExpected}`, function () {
        beforeEach(async () => {
          // Prevent interference from other modules' sendTelemetry calls
          pushTelemetry = app.services.telemetry.api.push;
          app.services.telemetry.api.push = () => {};

          // Reset prefs to default
          clearTelemetryPrefs();
          await waitFor(() => anolysis.isAnolysisInitialized());

          // Reset Anolysis
          const anolysisVersionPrefChanged = waitForPrefChange('anolysisVersion');
          prefs.set('anolysisVersion', 0);
          await anolysisVersionPrefChanged;
          await app.disableModule('freshtab');
          await app.disableModule('anolysis');
          await app.enableModule('anolysis');
          await waitFor(() => anolysis.isAnolysisInitialized());

          // Set telemetry prefs
          prefs.set('telemetry', telemetryEnabled);
          prefs.set('uploadEnabled', uploadEnabled, 'datareporting.healthreport.');
        });

        afterEach(async () => {
          // reset mock
          app.services.telemetry.api.push = pushTelemetry;
          await app.enableModule('freshtab');
        });

        if (telemetryExpected) {
          it('enables Anolysis and accepts signals', async () => {
            await waitFor(() => anolysis.isAnolysisInitialized());
            await pushTelemetry({ type: 'home', action: 'show' }, 'freshtab.home.show');
            expect((await anolysis.actions.getMetricsForDate(today))['freshtab.home.show']).to.have.length(1);
          });
        } else {
          it('disables Anolysis and rejects signals', async () => {
            // We expect Anolysis to be unloaded by pref change
            await waitFor(() => !anolysis.isAnolysisInitialized());

            try {
              await pushTelemetry({ type: 'home', action: 'show' }, 'freshtab.how.show');
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
