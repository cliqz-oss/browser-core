/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

class ModuleDisabledError {

}

export default describeModule('core/app/module', () => ({
  'platform/globals': {
    chrome: {},
  },
  'core/logger': {
    default: {
      get: () => console,
    },
  },
  'core/app/modules': {
    default: {
      test: {
        init: () => Promise.resolve(),
        unload: () => {},
      },
      broken: {
        init: () => { throw new TypeError('Broken'); },
        unload: () => {},
      },
      stateful: {
        stateInit: 0,
        stateUnload: 0,
        init() {
          this.stateInit += 1;
          return Promise.resolve();
        },
        unload() {
          this.stateUnload += 1;
        },
      }
    },
  },
  'core/app/module-errors': {
    ModuleDisabledError,
  },
}), () => {
  describe('module lifecycle states', () => {
    let Module;

    beforeEach(function () {
      Module = this.module().default;
    });

    it('gets constructed with a not initialized state', () => {
      const m = new Module('test');
      chai.expect(m.isNotInitialized).to.be.true;
    });

    it('has enabling state while enabling', () => {
      const m = new Module('test');
      m.enable();
      chai.expect(m.isEnabling).to.be.true;
    });

    it('has enabled state when `enable` resolves', async () => {
      const m = new Module('test');
      await m.enable();
      chai.expect(m.isEnabled).to.be.true;
    });

    it('has disabled state when `disable` is called on enabled module', async () => {
      const m = new Module('test');
      m.disable();
      chai.expect(m.isDisabled).to.be.true;
    });

    it('has disabled state when `disable` is called', async () => {
      const m = new Module('test');
      await m.enable();
      m.disable();
      chai.expect(m.isDisabled).to.be.true;
    });

    it('has disabled state when module failed to initialize', async () => {
      const m = new Module('broken');
      await m.enable().catch(() => {});
      chai.expect(m.isDisabled).to.be.true;
    });

    it('rethrows error happened during initialization', async () => {
      const m = new Module('broken');
      await chai.expect(m.enable()).to.eventually.be.rejectedWith('Broken')
        .and.be.instanceof(TypeError);
    });
  });

  describe('state transition consistency', () => {
    let Module;

    beforeEach(function () {
      Module = this.module().default;
    });

    it('doesn\'t initialize the second time when enabling a module already being enabled', async () => {
      const m = new Module('stateful');
      const enablingPromise = m.enable();
      await m.enable();
      await enablingPromise;
      chai.expect(m.background.stateInit).to.be.equal(1);
    });

    it('doesn\'t initialize the second time when enabling an already enabled module', async () => {
      const m = new Module('stateful');
      await m.enable();
      await m.enable();
      chai.expect(m.background.stateInit).to.be.equal(1);
    });

    it('doesn\'t call `unload` when disabling not enabled module', async () => {
      const m = new Module('stateful');
      chai.expect(m.isNotInitialized).to.be.true;
      m.disable();
      chai.expect(m.background.stateUnload).to.be.equal(0);
      chai.expect(m.isDisabled).to.be.true;
      m.disable();
      chai.expect(m.background.stateUnload).to.be.equal(0);
    });

    it('doesn\'t call `unload` when disabling already disabled module', async () => {
      const m = new Module('stateful');
      m.disable();
      chai.expect(m.isDisabled).to.be.true;
      m.disable();
      chai.expect(m.background.stateUnload).to.be.equal(0);
    });

    it('doesn\'t call `unload` the second time when disabling already disabled module', async () => {
      const m = new Module('stateful');
      await m.enable();
      chai.expect(m.isEnabled).to.be.true;
      m.disable();
      chai.expect(m.isDisabled).to.be.true;
      m.disable();
      chai.expect(m.background.stateUnload).to.be.equal(1);
    });

    it('doesn\'t call `unload` the second time when disabling already disabled module', async () => {
      const m = new Module('stateful');
      await m.enable();
      chai.expect(m.isEnabled).to.be.true;
      m.disable();
      chai.expect(m.isDisabled).to.be.true;
      m.disable();
      chai.expect(m.background.stateUnload).to.be.equal(1);
    });

    it('doesn\'t call `unload` until module while it is in `enabling` state', async () => {
      const m = new Module('stateful');
      const enablePromise = m.enable();
      chai.expect(m.isEnabling).to.be.true;
      m.disable();
      chai.expect(m.background.stateUnload).to.be.equal(0);
      await enablePromise;
      chai.expect(m.background.stateInit).to.be.equal(1);
      chai.expect(m.background.stateUnload).to.be.equal(1);
      chai.expect(m.isDisabled).to.be.true;
    });
  });

  describe('module\' isReady', () => {
    let Module;

    beforeEach(async function () {
      Module = this.module().default;
    });

    it('resolves when module is enabled', async () => {
      const m = new Module('test');
      await m.enable();
      await chai.expect(m.isReady()).to.be.fulfilled;
    });

    it('rejects when module fails to initialize', async () => {
      const m = new Module('broken');
      await m.enable().catch(() => {});

      await chai.expect(m.isReady()).to.eventually.be.rejectedWith('Broken')
        .and.be.instanceof(TypeError);
    });

    it('rejects with ModuleDisabledError error when module disabled', async () => {
      const m = new Module('test');
      await m.disable();
      await chai.expect(m.isReady()).to.eventually.be.rejected
        .and.be.instanceof(ModuleDisabledError);
    });

    it('isReady promise stays the same status if enabled twice', async () => {
      const m = new Module('test');
      await m.enable();
      const isReady = m.isReady();
      await m.enable();
      chai.expect(m.isReady()).to.be.equal(isReady);
    });
  });

  describe('when enabling module previously marked as disabled', function () {
    let Module;

    beforeEach(function () {
      Module = this.module().default;
    });

    it('reports correct isReady status', async () => {
      const m = new Module('test');
      await m.disable();
      await m.enable();
      await chai.expect(m.isReady()).to.be.fulfilled;
    });
  });
});
