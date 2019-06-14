/* global chai */

// From: https://stackoverflow.com/a/43053803
const f = (a, b) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);

require('../telemetry-schemas-test-helpers')({
  name: 'news-snippets',
  metrics: [
    'freshtab.home.click.breakingnews',
    'freshtab.home.click.topnews',
    'freshtab.home.click.yournews',
    'freshtab.home.hover.breakingnews',
    'freshtab.home.hover.topnews',
    'freshtab.home.hover.yournews',
  ],
  tests: (generateAnalysisResults) => {
    const test = async (actions, check) => {
      const metrics = {};
      actions.forEach(({ edition, target, action, element, index }) => {
        const metricName = `freshtab.home.${action}.${target}`;
        if (metrics[metricName] === undefined) {
          metrics[metricName] = [];
        }
        metrics[metricName].push({
          type: 'home',
          edition,
          action,
          target,
          index,
          element: element || '',
        });
      });
      check(await generateAnalysisResults(metrics));
    };

    it('handles no interaction', () =>
      test([], signals => chai.expect(signals).to.be.empty));

    // Generate tests for all targets/actions/editions
    cartesian(
      [
        'de',
        'de-tr-en',
        'es',
        'fr',
        'gb',
        'intl',
        'it',
        'us',
      ],
      ['click', 'hover'], // action
      ['topnews', 'breakingnews', 'yournews'], // target
    ).forEach(([edition, action, target]) => {
      it(`handles ${action} on ${target} with edition ${edition}`, () =>
        test([
          { edition, target, action, index: 0 },
          { edition, target, action, index: 1 },
          { edition, target, action, index: 2 },
        ], (signals) => {
          chai.expect(signals).to.have.length(1);
          chai.expect(signals[0]).to.be.eql({
            edition,
            action,
            target,
            histogram: [1, 1, 1],
          });
        }));
    });
  },
});
