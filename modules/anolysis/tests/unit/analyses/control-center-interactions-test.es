/* global chai */

require('../telemetry-schemas-test-helpers')({
  name: 'analyses.controlCenter.interactions',
  metrics: [
    'metrics.controlCenter.show',
    'metrics.controlCenter.click.pause',
    'metrics.controlCenter.click.resume',
    'metrics.controlCenter.click.trustSite',
    'metrics.controlCenter.click.restrictSite',
  ],
  tests: (generateAnalysisResults) => {
    const arrayof3 = [{}, {}, {}];

    it('generates 0 signals if no telemetry was sent', async () =>
      chai.expect(await generateAnalysisResults({})).to.have.length(0));

    it('shows correct show count', () =>
      generateAnalysisResults({
        'metrics.controlCenter.show': arrayof3
      }).then(([first]) => chai.expect(first.shows).to.equal(3)));

    it('shows correct pause clicks count', () =>
      generateAnalysisResults({
        'metrics.controlCenter.click.pause': arrayof3
      }).then(([first]) => chai.expect(first.clicks.pause).to.equal(3)));

    it('shows correct resume click count', () =>
      generateAnalysisResults({
        'metrics.controlCenter.click.resume': arrayof3
      }).then(([first]) => chai.expect(first.clicks.resume).to.equal(3)));

    it('shows correct trust site clicks count', () =>
      generateAnalysisResults({
        'metrics.controlCenter.click.trustSite': arrayof3
      }).then(([first]) => chai.expect(first.clicks.trustSite).to.equal(3)));

    it('shows correct restrict site click count', () =>
      generateAnalysisResults({
        'metrics.controlCenter.click.restrictSite': arrayof3
      }).then(([first]) => chai.expect(first.clicks.restrictSite).to.equal(3)));
  },
});
