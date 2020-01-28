/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, sinon, describeModule */

const tests = () => {
  describe('#disableModule', function () {
    let App;

    beforeEach(function () {
      App = this.module().default;
    });

    it('sets a pref', async function () {
      const setPref = sinon.spy();
      const app = new App();
      app.isRunning = true;

      app.modules.test = {
        isDisabled: false,
        disable: () => {},
      };

      this.deps('core/prefs').default.set = setPref;

      await app.disableModule('test');

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
      'webextension-polyfill': {
        default: {},
      },
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
      'platform/globals': {
        chrome: {},
      },
      'platform/browser': {
        forEachWindow() {},
      },
      'core/platform': {
        default: {},
      },
      'platform/sqlite': {
        openDBHome: () => {},
        close: () => {},
      }
    };
  },
  tests);
