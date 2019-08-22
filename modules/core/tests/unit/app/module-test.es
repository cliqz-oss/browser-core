/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule, require */
const urlImports = require('../utils/url-parser');

export default describeModule('core/app/module', () => ({
  'platform/globals': {
    chrome: {},
  },
  'core/app/modules': {
    default: {
      test: {
        Background: {
          init: () => Promise.resolve(),
          unload: () => {},
        },
      }
    },
  },
  ...urlImports,
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

    it('has disabled state when `disable` is called', async () => {
      const m = new Module('test');
      await m.enable();
      m.disable();
      chai.expect(m.isDisabled).to.be.true;
    });

    it('reports correct isReady status if markedAsEnabling twice', async () => {
      const m = new Module('test');
      await m.markAsEnabling();
      const isReady = m.isReady();
      await m.markAsEnabling();
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
      await m.markAsDisabled();
      await m.enable();
      await chai.expect(m.isReady()).to.be.fulfilled;
    });
  });
});
