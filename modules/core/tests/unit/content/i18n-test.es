/* global chai, describeModule, sinon  */

export default describeModule('core/content/i18n',
  () => ({}),
  () => {
    describe('#getMessage', function () {
      let i18n;
      let getMessage;

      beforeEach(function () {
        i18n = this.module().default;
        global.chrome = {
          i18n: {
            getMessage(...args) {
              return getMessage(...args);
            },
          },
        };
      });

      afterEach(function () {
        delete global.chrome;
      });

      it('getMessage without substitutions correctly', function () {
        getMessage = () => 'en';
        chai.expect(i18n.getMessage('lang_code')).to.equal('en');
      });

      it('getMessage with number as substitutions correctly', function () {
        getMessage = sinon.spy();
        i18n.getMessage('lang_code', 1);
        chai.expect(getMessage).to.have.been.calledWith('lang_code', ['1']);
      });

      it('getMessage with string as substitutions correctly', function () {
        getMessage = sinon.spy();
        i18n.getMessage('lang_code', '1');
        chai.expect(getMessage).to.have.been.calledWith('lang_code', ['1']);
      });

      it('getMessage with 1-element array as substitutions correctly', function () {
        getMessage = sinon.spy();
        i18n.getMessage('lang_code', [1]);
        chai.expect(getMessage).to.have.been.calledWith('lang_code', ['1']);
      });

      it('getMessage with multi-elements array as substitutions correctly', function () {
        getMessage = sinon.spy();
        i18n.getMessage('lang_code', [1, 2]);
        chai.expect(getMessage).to.have.been.calledWith('lang_code', ['1', '2']);
      });
    });
  });
