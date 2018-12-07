/* global describeModule */
/* global chai */

export default describeModule('firefox-specific/background',
  function () {
    return {
      '../core/base/background': {
        default: x => x,
      },
      '../core/browser': {
        Window() {},
      },
      '../core/prefs': {
        default: {
          get() {},
        },
        getCliqzPrefs: '[dynamic]',
      },
      '../core/utils': {
        default: {
          isDefaultBrowser() {},
          isPrivateMode() {},
        },
      },
      '../platform/globals': {
        Services: {
          search: {}
        },
      },
      '../core/history-manager': {
        default: {},
      },
      '../core/history-service': {
        default: {
          onVisited: {
            addListener: () => null,
            removeListener: () => null,
          },
        },
      },
      '../core/kord/inject': {
        default: {
          service() {
            return {
              push: () => null,
            };
          },
        },
      },
      '../core/search-engines': {
        getDefaultEngine: () => '',
      },
      '../core/demographics': {
        getDaysSinceInstall: () => 42,
      },
    };
  },
  function () {
    const startup = true;
    const searchEngineName = 'test-engine';
    let backgroundModule;

    beforeEach(function () {
      backgroundModule = this.module().default;
    });

    describe('#whoAmI', function () {
      it('calls #sendEnvironmentalSignal', function (done) {
        this.deps('../platform/globals').Services.search = {
          currentEngine: {
            name: searchEngineName
          }
        };
        backgroundModule.sendEnvironmentalSignal = (
          { startup: _startup, defaultSearchEngine: engineName }
        ) => {
          try {
            chai.expect(_startup).to.equal(startup);
            chai.expect(engineName).to.equal(searchEngineName);
          } catch (e) {
            done(e);
            return;
          }
          done();
        };
        backgroundModule.whoAmI({ startup: true });
      });
    });

    describe('#sendEnvironmentalSignal', function () {
      it('calls utils.telemetry', function () {
        this.deps('../core/browser').Window.findById = () => ({
          window: {
            document: {
              getElementById() { return {}; }
            },
            navigator: {
              userAgent: 'Mozilla'
            },
          },
        });
        this.deps('../core/prefs').getCliqzPrefs = () => ({
          session: '111',
          config_location: '111'
        });
        this.deps('../core/utils').default.extensionVersion = '1';
        this.deps('../core/utils').default.telemetry = (signal, flag, schema) => {
          if (schema !== 'metrics.experiments.serp.state') {
            const prefs = signal.prefs;
            chai.expect(signal).to.have.property('type').that.equal('environment');
            chai.expect(signal).to.have.property('agent').that.contain('Mozilla');
            chai.expect(signal).to.have.property('version').that.exist;
            chai.expect(prefs).to.exist;
            chai.expect(prefs).to.have.property('session').that.exist;
            chai.expect(prefs).to.have.property('config_location').that.exist;
          }
        };
        this.deps('../core/history-manager').default.getStats = cb => cb({

        });
        backgroundModule.sendEnvironmentalSignal(
          { startup, defaultSearchEngine: searchEngineName }
        );
      });
    });
  });
