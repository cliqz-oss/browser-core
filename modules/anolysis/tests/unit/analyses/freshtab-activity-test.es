/* global chai */

require('../telemetry-schemas-test-helpers')({
  name: 'freshtab-activity',
  metrics: [
    'freshtab.home.show',
    'freshtab.home.click.topsite',
    'freshtab.home.click.favorite'
  ],
  tests: (generateAnalysisResults) => {
    const arrayof3 = [{}, {}, {}];

    it('generates 0 signals if no telemetry was sent', () =>
      generateAnalysisResults({}).then(signals => chai.expect(signals).to.have.length(0)));

    it('shows correct show count', () =>
      generateAnalysisResults({
        'freshtab.home.show': arrayof3
      }).then(([first]) => chai.expect(first.shows).to.equal(3)));

    it('shows correct topSites click count', () =>
      generateAnalysisResults({
        'freshtab.home.click.topsite': arrayof3
      }).then(([first]) => chai.expect(first.clicks.topSites).to.equal(3)));

    it('shows correct customSites click count', () =>
      generateAnalysisResults({
        'freshtab.home.click.favorite': arrayof3
      }).then(([first]) => chai.expect(first.clicks.customSites).to.equal(3)));
  },
});
