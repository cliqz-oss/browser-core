export default describeModule('firefox-specific/window',
  function () {
    return {
      '../core/utils': {
        default: {
          setTimeout() {},
          getPref() {},
          getCliqzPrefs() {},
          isDefaultBrowser() {},
          isPrivate() {},
        },
      },
      '../core/events': {
        default: {},
      },
      './demo': {
        default: {},
      },
      './redirect': {
        default: {},
      },
      '../core/history-manager': {
        default: {},
      },
      '../platform/globals': {
        Services: {
          search: {}
        },
      },
      '../core/browser': {
        window: w => w
      },
      '../core/kord/inject': {
        default: {}
      },
      '../core/console': {
        default: {
          log() {},
          error() {},
          debug() {},
        },
      },
    };
  },
  function () {
    const startup = true;
    const searchEngineName = 'test-engine';
    let windowModule;

    beforeEach(function() {
      const Window = this.module().default;
      windowModule = new Window({});
    });

    describe('#whoAmI', function (){

      it('calls #sendEnvironmentalSignal', function (done) {
        this.deps('../platform/globals').Services.search = {
          currentEngine: {
            name: searchEngineName
          }
        };
        this.deps('../core/utils').default.fetchAndStoreConfig = cb => Promise.resolve();
        this.module().default.prototype.sendEnvironmentalSignal = (_startup, engineName) => {
          try {
            chai.expect(_startup).to.equal(startup);
            chai.expect(engineName).to.equal(searchEngineName);
          } catch (e) {
            done(e);
            return;
          }
          done();
        };
        windowModule.whoAmI(true);
      });
    });

    describe('#sendEnvironmentalSignal', function () {
      it('calls utils.telemetry', function () {
        windowModule.window = {
          document: {
            getElementById() { return {}; }
          },
          navigator: {
            userAgent: 'Mozilla'
          }
        };
        this.deps('../core/utils').default.getCliqzPrefs = () => ({
          session: '111',
          config_location: '111'
        })
        this.deps('../core/utils').default.extensionVersion = '1';
        this.deps('../core/utils').default.telemetry = signal => {
          const prefs = signal.prefs;
          chai.expect(signal).to.have.property('type').that.equal('environment');
          chai.expect(signal).to.have.property('agent').that.contain('Mozilla');
          chai.expect(signal).to.have.property('version').that.exist;
          chai.expect(prefs).to.exist;
          chai.expect(prefs).to.have.property('session').that.exist;
          chai.expect(prefs).to.have.property('config_location').that.exist;
        }
        this.deps('../core/history-manager').default.getStats = cb => cb({

        });
        this.deps('../core/kord/inject').default.module = () => ({
          action: () => Promise.resolve(),
        });
        windowModule.sendEnvironmentalSignal(startup, searchEngineName);
      });
    });
  }
);
