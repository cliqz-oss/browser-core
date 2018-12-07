import {
  checkSettingsUI,
  getActiveConfig,
  Subject,
} from '../../core/test-helpers-freshtab';

context('Freshtab settings panel UI', function () {
  let subject;

  before(function () {
    subject = new Subject();
    subject.respondsWithEmptyTelemetry();
    subject.respondsWithEmptySpeedDials();
    subject.respondsWithEmptyNews();
    subject.respondsWithEmptyStats();
  });

  checkSettingsUI({
    defaultState: false,
    subject: () => subject,
  });

  checkSettingsUI({
    responseConfig: getActiveConfig(),
    subject: () => subject,
  });
});
