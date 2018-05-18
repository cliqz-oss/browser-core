const MOCK = {
  'core/utils': {
    default: {
      extensionVersion: null,
    }
  },
};

export default describeModule('abtests/demographics',
  () => MOCK,
  () => {
    describe('#getCoreVersion', () => {
      let getCoreVersion;

      beforeEach(function () {
        getCoreVersion = this.module().default;
      });

      it('parses 1 part', () => {
        MOCK['core/utils'].default.extensionVersion = '1';
        chai.expect(getCoreVersion()).to.equal('1.0.0');
      });

      it('parses 2 parts', () => {
        MOCK['core/utils'].default.extensionVersion = '1.0';
        chai.expect(getCoreVersion()).to.equal('1.0.0');
      });

      it('parses 3 parts', () => {
        MOCK['core/utils'].default.extensionVersion = '1.0.0';
        chai.expect(getCoreVersion()).to.equal('1.0.0');
      });

      it('parses 4 parts', () => {
        MOCK['core/utils'].default.extensionVersion = '1.0.0.1b3';
        chai.expect(getCoreVersion()).to.equal('1.0.0.1b3');
      });

      it('parses rejects invalid format', () => {
        MOCK['core/utils'].default.extensionVersion = 'X.0.0.1b3';
        chai.expect(getCoreVersion()).to.be.null;
      });
    });
  }
);
