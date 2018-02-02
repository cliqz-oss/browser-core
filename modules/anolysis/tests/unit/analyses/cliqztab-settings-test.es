const MOCK = {
  'core/prefs': {
    default: {
      get: (k, d) => MOCK_PREFS.has(k) ? MOCK_PREFS.get(k) : d,
    }
  },
};

let MOCK_PREFS = new Map();

export default describeModule('anolysis/analyses/cliqztab-settings',
  () => MOCK,
  () => {
    describe('', () => {
      let cliqztabSettings;
      const aggregation = { types: {} };
      let signal;

      beforeEach(function () {
        cliqztabSettings = this.module().default;
        MOCK_PREFS = new Map();
      });

      it('reports theme state from pref', () => {
        signal = cliqztabSettings(aggregation)[0]
        chai.expect(signal.is_theme_on).to.be.false;

        MOCK_PREFS.set('freshtab.blueTheme.enabled', true);
        signal = cliqztabSettings(aggregation)[0];
        chai.expect(signal.is_theme_on).to.be.true;

        MOCK_PREFS.set('freshtab.blueTheme.enabled', false);
        signal = cliqztabSettings(aggregation)[0];
        chai.expect(signal.is_theme_on).to.be.false;
      });

      it('reports background state from pref', () => {
        // not set => background on
        signal = cliqztabSettings(aggregation)[0]
        chai.expect(signal.is_background_on).to.be.true;

        // default image => no background
        MOCK_PREFS.set('freshtabConfig', '{ "background": { "image": "bg-default" } }');
        signal = cliqztabSettings(aggregation)[0];
        chai.expect(signal.is_background_on).to.be.false;

        // any image => background on
        MOCK_PREFS.set('freshtabConfig', '{ "background": { "image": "some_img" } }');
        signal = cliqztabSettings(aggregation)[0];
        chai.expect(signal.is_background_on).to.be.true;
      });

      it('reports most visited state from pref', () => {
        signal = cliqztabSettings(aggregation)[0]
        chai.expect(signal.is_most_visited_on).to.be.false;

        MOCK_PREFS.set('freshtabConfig', '{ "historyDials": { "visible": false } }');
        signal = cliqztabSettings(aggregation)[0];
        chai.expect(signal.is_most_visited_on).to.be.false;

        MOCK_PREFS.set('freshtabConfig', '{ "historyDials": { "visible": true } }');
        signal = cliqztabSettings(aggregation)[0];
        chai.expect(signal.is_most_visited_on).to.be.true;
      });

      it('reports favorites state from pref', () => {
        signal = cliqztabSettings(aggregation)[0]
        chai.expect(signal.is_favorites_on).to.be.false;

        MOCK_PREFS.set('freshtabConfig', '{ "customDials": { "visible": false } }');
        signal = cliqztabSettings(aggregation)[0];
        chai.expect(signal.is_favorites_on).to.be.false;

        MOCK_PREFS.set('freshtabConfig', '{ "customDials": { "visible": true } }');
        signal = cliqztabSettings(aggregation)[0];
        chai.expect(signal.is_favorites_on).to.be.true;
      });

      it('reports search state from pref', () => {
        signal = cliqztabSettings(aggregation)[0]
        chai.expect(signal.is_search_on).to.be.false;

        MOCK_PREFS.set('freshtabConfig', '{ "search": { "visible": false } }');
        signal = cliqztabSettings(aggregation)[0];
        chai.expect(signal.is_search_on).to.be.false;

        MOCK_PREFS.set('freshtabConfig', '{ "search": { "visible": true } }');
        signal = cliqztabSettings(aggregation)[0];
        chai.expect(signal.is_search_on).to.be.true;
      });

      it('reports news state from pref', () => {
        signal = cliqztabSettings(aggregation)[0]
        chai.expect(signal.is_news_on).to.be.false;

        MOCK_PREFS.set('freshtabConfig', '{ "news": { "visible": false } }');
        signal = cliqztabSettings(aggregation)[0];
        chai.expect(signal.is_news_on).to.be.false;

        MOCK_PREFS.set('freshtabConfig', '{ "news": { "visible": true } }');
        signal = cliqztabSettings(aggregation)[0];
        chai.expect(signal.is_news_on).to.be.true;
      });
    });
  },
);
