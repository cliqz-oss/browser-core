import {
  defaultConfig,
  generateNewsResponse,
  getActiveConfig,
  checkSettingsInt,
  Subject,
} from '../../core/test-helpers-freshtab';

describe('Freshtab interactions with settings switches', function () {
  let subject;

  beforeEach(function () {
    subject = new Subject({
      injectTestUtils: true,
    });
    subject.respondsWithEmptyTelemetry();
    subject.respondsWithOneHistory();
    subject.respondsWithEmptyStats();
    subject.respondsWith({
      module: 'freshtab',
      action: 'getNews',
      response: generateNewsResponse()[6]
    });
  });

  checkSettingsInt({
    responseConfig: getActiveConfig(),
    subject: () => subject,
  });

  checkSettingsInt({
    defaultState: false,
    responseConfig: defaultConfig,
    subject: () => subject,
  });
});
