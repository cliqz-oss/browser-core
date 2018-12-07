/* global chai */

const test = require('../telemetry-schemas-test-helpers');

const testSignals = {
  'metrics.consentric.pageAction': [{
    type: 'iab',
    site: 'focus.de',
  }, {
    type: 'iab',
    site: 'chip.de',
  }, {
    type: 'iab',
    site: 'chip.de',
  }, {
    type: 'google',
    site: 'google.com',
  }],
  'metrics.consentric.popupOpened': [{
    site: 'focus.de/',
    type: 'iab',
    writeable: true,
    allowed: 1,
  }, {
    type: 'google',
    site: 'google.com',
    writeable: true,
    allowed: 2,
  }],
  'metrics.consentric.consentChanged': [{
    allowed: 2,
    site: 'focus.de',
  }],
  'metrics.consentric.clicked': [{
    type: 'google',
  }],
};

test({
  name: 'analysis.consentric.iab',
  metrics: [
    'metrics.consentric.pageAction',
    'metrics.consentric.popupOpened',
    'metrics.consentric.consentChanged',
    'metrics.consentric.clicked',
  ],
  tests: (generateAnalysisResults) => {
    it('generates a signal', async () => {
      const signals = await generateAnalysisResults(testSignals);
      chai.expect(signals).to.have.length(1);
      chai.expect(signals[0]).to.eql({
        pageActionCount: 3,
        pageActionSites: 2,
        popupCount: 1,
        popupSites: 1,
        consentChangedCount: 1,
        consentChangedSites: 1,
        allowedHist: {
          0: 0,
          1: 0,
          2: 1,
          3: 0,
          4: 0,
          5: 0,
        },
      });
    });
  }
});

test({
  name: 'analysis.consentric.google',
  metrics: [
    'metrics.consentric.pageAction',
    'metrics.consentric.popupOpened',
    'metrics.consentric.consentChanged',
    'metrics.consentric.clicked',
  ],
  tests: (generateAnalysisResults) => {
    it('generates a signal', async () => {
      const signals = await generateAnalysisResults(testSignals);
      chai.expect(signals).to.have.length(1);
      chai.expect(signals[0]).to.eql({
        pageActionCount: 1,
        pageActionSites: 1,
        popupCount: 1,
        popupSites: 1,
        clickedCount: 1,
        clickedSites: 1,
      });
    });
  }
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
