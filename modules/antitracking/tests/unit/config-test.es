
let mockPrefs = {};

export default describeModule('antitracking/config', 
  () => ({
    './persistent-state': {
      getValue: (p, d) => (mockPrefs[p] || d),
    },
    'core/resource-loader': {
      default: {},
    },
    'core/resource-manager': {
      default: {}
    },
    'core/console': console,
    'core/utils': {
      default: {
        getPref: (p, d) => (mockPrefs[p] || d),
        setPref: (p, v) => mockPrefs[p] = v,
      },
    },
  }),
  () => {
    let Config;
    let DEFAULTS;
    let PREFS;

    beforeEach(function() {
      mockPrefs = {};
      Config = this.module().default;
      DEFAULTS = this.module().DEFAULTS;
      PREFS = this.module().PREFS;
    });

    it('has default config values by default', () => {
      const config = new Config({});

      Object.keys(DEFAULTS).forEach((k) => {
        chai.expect(config[k]).to.equal(DEFAULTS[k]);
      });
    });

    it('has default pref values by default', () => {
      const config = new Config({});

      Object.keys(PREFS).forEach((k) => {
        chai.expect(config[k]).to.equal(DEFAULTS[k] || false);
      });
    });

    it('loads values from prefs', () => {
      Object.keys(PREFS).forEach((pr) => {
        mockPrefs[PREFS[pr]] = true;
      });
      const config = new Config({});

      Object.keys(PREFS).forEach((k) => {
        chai.expect(config[k]).to.equal(true);
      });
    });

    describe('#setPref', () => {

      it('persists to prefs', () => {
        const config = new Config({});
        config.setPref('enabled', true);
        chai.expect(mockPrefs['modules.antitracking.enabled']).to.be.true;
      });

      it('throws error if pref doesn\'t exist', () => {
        const config = new Config({});
        chai.expect(() => config.setPref('unknown', true)).to.throw(Error);
      });
    })
    
  }
);