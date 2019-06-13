/* global chai, sinon, describeModule */

const tests = () => {
  describe('#disableModule', function () {
    let App;

    beforeEach(function () {
      App = this.module().default;
    });

    it('sets a pref', function () {
      const setPref = sinon.spy();
      const app = new App();

      app.modules.test = {
        isDisabled: true,
      };

      this.deps('core/prefs').default.set = setPref;

      app.disableModule('test');

      chai.expect(setPref).to.be.calledWith('modules.test.enabled', false);
    });

    it('returns a promise for modules that are enabling', async function () {
      const app = new App();
      const disableSpy = sinon.spy();
      app.isRunning = true;

      app.modules.test = {
        isDisabled: false,
        isEnabling: true,
        disable: disableSpy,
        isReady: () => Promise.resolve(),
      };

      const disablePromise = app.disableModule('test');

      chai.expect(disableSpy).to.not.be.called;
      chai.expect(disablePromise).to.be.instanceof(Promise);

      await chai.expect(disablePromise).to.be.fulfilled;

      chai.expect(disableSpy).to.be.called;
    });
  });
};

export default describeModule('core/app',
  function () {
    return {
      'core/events': {
        default: {},
      },
      'core/prefs': {
        default: {
          set() {},
          has: () => false,
          get() {},
        },
      },
      'core/console': {
        isLoggingEnabled: () => false,
        default: {},
      },
      'core/i18n': {
        default: {},
      },
      'core/kord': {
        setApp() {},
      },
      'core/app/module': {
        default: class {},
      },
      'platform/browser': {
        forEachWindow() {},
      },
      'core/platform': {
        default: {},
        isOnionModeFactory: () => (() => false),
      },
      'platform/sqlite': {
        openDBHome: () => {},
        close: () => {},
      }
    };
  },
  tests);
