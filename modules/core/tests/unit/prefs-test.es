/* global chai, describeModule */

export default describeModule('core/prefs',
  function () {
    return {
      '../platform/prefs': {
        getAllCliqzPrefs: '[dynamic]',
        getPref: '[dynamic]',
        PLATFORM_TELEMETRY_WHITELIST: [],
      },
    };
  },
  function () {
    context('core/prefs tests', function () {
      describe('#getCliqzPrefs', function () {
        let subject;
        beforeEach(function () {
          subject = this.module().getCliqzPrefs;
          this.deps('../platform/prefs').getPref = function () {};
        });

        it('includes whitelist keys', function () {
          this.deps('../platform/prefs').getAllCliqzPrefs = function () {
            return ['session'];
          };
          chai.expect(subject()).to.have.property('session');
        });

        it('does not include unexpected keys', function () {
          this.deps('../platform/prefs').getAllCliqzPrefs = function () {
            return ['test'];
          };
          chai.expect(subject()).to.not.have.property('test');
        });
      });
    });
  });
