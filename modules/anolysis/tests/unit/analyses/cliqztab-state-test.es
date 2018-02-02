/* global describeModule */

let MOCK_PREFS = new Map();

const MOCK = {
  'core/prefs': {
    default: {
      get: (k, d) => (MOCK_PREFS.has(k) ? MOCK_PREFS.get(k) : d),
    }
  },
};

export default describeModule('anolysis/analyses/cliqztab-state',
  () => MOCK,
  () => {
    describe('#generateSignals', () => {
      let cliqztabState;
      const aggregation = { types: {} };
      let signal;

      beforeEach(function () {
        cliqztabState = this.module().default;
        MOCK_PREFS = new Map();
      });

      it('reports CliqzTab state from pref', () => {
        signal = cliqztabState(aggregation)[0]
        chai.expect(signal.is_cliqztab_on).to.be.false;

        MOCK_PREFS.set('freshtab.state', true);
        signal = cliqztabState(aggregation)[0];
        chai.expect(signal.is_cliqztab_on).to.be.true;

        MOCK_PREFS.set('freshtab.state', false);
        signal = cliqztabState(aggregation)[0];
        chai.expect(signal.is_cliqztab_on).to.be.false;
      });
    });
  },
);
