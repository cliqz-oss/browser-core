/* global chai, describeModule, require */

const punycode = require('punycode');
const tldts = require('tldts');

export default describeModule('core/app/module', () => ({
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
  'platform/lib/punycode': {
    default: punycode,
  },
  'platform/lib/tldts': {
    default: tldts,
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

    it('has disabled state when `disable` is called', async () => {
      const m = new Module('test');
      await m.enable();
      m.disable();
      chai.expect(m.isDisabled).to.be.true;
    });
  });
});
