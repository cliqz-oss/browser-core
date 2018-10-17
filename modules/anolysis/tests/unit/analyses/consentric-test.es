
const test = require('../telemetry-schemas-test-helpers');

test({
  name: 'analysis.consentric.iab',
  metrics: [
    'metrics.consentric.pageAction',
    'metrics.consentric.popupOpened',
    'metrics.consentric.consentChanged',
    'metrics.consentric.clicked',
  ],
});

test({
  name: 'analysis.consentric.google',
  metrics: [
    'metrics.consentric.pageAction',
    'metrics.consentric.popupOpened',
    'metrics.consentric.consentChanged',
    'metrics.consentric.clicked',
  ],
});

test({
  name: 'analysis.consentric.facebook',
  metrics: [
    'metrics.consentric.pageAction',
    'metrics.consentric.popupOpened',
    'metrics.consentric.consentChanged',
    'metrics.consentric.clicked',
  ],
});