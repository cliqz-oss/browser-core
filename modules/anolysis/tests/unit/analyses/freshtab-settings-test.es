/* global chai */

let freshTabEnabled = true;

class ModuleDisabledError {
  constructor() {
    this.name = 'ModuleDisabledError';
  }
}

require('../telemetry-schemas-test-helpers')({
  name: 'freshtab.prefs.blueTheme',
  metrics: [],
  mock: {
    'core/kord/inject': {
      default: {
        module() {
          return {
            isEnabled: () => true,
            async action(action) {
              if (!freshTabEnabled) {
                throw new ModuleDisabledError();
              }

              if (action === 'isBlueThemeEnabled') {
                return true;
              }
              return Promise.reject(new Error(`No such action: ${action}`));
            },
          };
        },
      },
    },
  },
  tests: (generateAnalysisResults) => {
    beforeEach(() => {
      freshTabEnabled = true;
    });

    it('does not generate signals when freshtab is disabled', async () => {
      freshTabEnabled = false;
      chai.expect(await generateAnalysisResults()).to.be.empty;
    });
  },
});

require('../telemetry-schemas-test-helpers')({
  name: 'freshtab.prefs.config',
  metrics: [],
  mock: {
    'core/kord/inject': {
      default: {
        module() {
          return {
            isEnabled: () => true,
            async action(action) {
              if (!freshTabEnabled) {
                throw new ModuleDisabledError();
              }

              if (action === 'getComponentsState') {
                return {};
              }
              return Promise.reject(new Error(`No such action: ${action}`));
            },
          };
        },
      },
    },
  },
  tests: (generateAnalysisResults) => {
    beforeEach(() => {
      freshTabEnabled = true;
    });

    it('does not generate signals when freshtab is disabled', async () => {
      freshTabEnabled = false;
      chai.expect(await generateAnalysisResults()).to.be.empty;
    });
  },
});

require('../telemetry-schemas-test-helpers')({
  name: 'freshtab-settings',
  metrics: [
    'freshtab.prefs.blueTheme',
    'freshtab.prefs.config',
  ],
  tests: (generateAnalysisResults) => {
    const test = async (theme, config, check) => {
      const signals = await generateAnalysisResults({
        'freshtab.prefs.config': [config],
        'freshtab.prefs.blueTheme': [{ enabled: theme }],
      });
      chai.expect(signals).to.have.length(1);
      check(signals[0]);
    };

    it('gets right defaults', () => test(true, {}, s => chai.expect(s).to.be.eql({
      is_theme_on: true,
      is_background_on: true,
      is_most_visited_on: false,
      is_favorites_on: false,
      is_search_on: false,
      is_news_on: false,
      is_stats_on: false,
    })));

    describe('reports theme state from pref', () => {
      it('enabled', () => test(true, {}, s => chai.expect(s.is_theme_on).to.be.true));
      it('disabled', () => test(false, {}, s => chai.expect(s.is_theme_on).to.be.false));
    });

    describe('reports background state from pref', () => {
      it('no background', () => test(true,
        { background: { image: 'bg-default' } },
        s => chai.expect(s.is_background_on).to.be.false));

      it('background on', () => test(true,
        { background: { image: 'some_img' } },
        s => chai.expect(s.is_background_on).to.be.true));
    });

    describe('reports most visited state from pref', () => {
      it('no most visited', () => test(true,
        { historyDials: { visible: false } },
        s => chai.expect(s.is_most_visited_on).to.be.false));

      it('most visited on', () => test(true,
        { historyDials: { visible: true } },
        s => chai.expect(s.is_most_visited_on).to.be.true));
    });

    describe('reports favorites state from pref', () => {
      it('no favorites', () => test(true,
        { customDials: { visible: false } },
        s => chai.expect(s.is_favorites_on).to.be.false));

      it('favorites on', () => test(true,
        { customDials: { visible: true } },
        s => chai.expect(s.is_favorites_on).to.be.true));
    });

    describe('reports search state from pref', () => {
      it('no search', () => test(true,
        { search: { visible: false } },
        s => chai.expect(s.is_search_on).to.be.false));

      it('search on', () => test(true,
        { search: { visible: true } },
        s => chai.expect(s.is_search_on).to.be.true));
    });

    describe('reports news state from pref', () => {
      it('no news', () => test(true,
        { news: { visible: false } },
        s => chai.expect(s.is_news_on).to.be.false));

      it('news on', () => test(true,
        { news: { visible: true } },
        s => chai.expect(s.is_news_on).to.be.true));
    });

    describe('reports stats state from pref', () => {
      it('no stats', () => test(true,
        { stats: { visible: false } },
        s => chai.expect(s.is_stats_on).to.be.false));

      it('stats on', () => test(true,
        { stats: { visible: true } },
        s => chai.expect(s.is_stats_on).to.be.true));
    });
  },
});
