export default describeModule("core/utils",
  function () {
    return {
      "core/console": {
        default: {}
      },
      "core/prefs": {
        default: {
          get() {}
        }
      },
      "core/storage": {
        default: {}
      },
      'core/events': {
        default: {}
      },
      "core/tlds": {
        TLDs: {}
      },
      'core/http': {
        httpHandler: {},
        promiseHttpHandler: {}
      },
      "autocomplete/autocomplete": {
        default: {}
      },
      "core/http": {
        promiseHttpHandler: {}
      },

      "platform/environment": {
        default: {}
      }
    };
  },
  function () {
    describe("#getCliqzPrefs", function () {
      let subject;
      beforeEach(function () {
        const utils = this.module().default;
        subject = utils.getCliqzPrefs.bind(utils);
      })

      it("includes simple keys", function () {
        this.module().default.getAllCliqzPrefs = function () {
          return ['simple_key'];
        }
        chai.expect(subject()).to.have.property('simple_key');
      });

      it("does not include 2-level keys", function () {
        this.module().default.getAllCliqzPrefs = function () {
          return ['lvl1.lvl2'];
        }
        chai.expect(subject()).to.not.have.property('lvl1.lvl2');
      });

      it("does not include 3-level keys and more", function () {
        this.module().default.getAllCliqzPrefs = function () {
          return ['lvl1.lvl2.lvl3.lvl4'];
        }
        chai.expect(subject()).to.not.have.property('lvl1.lvl2.lvl3.lvl4');
      });

      it("does not include keys with 'backup'", function () {
        this.module().default.getAllCliqzPrefs = function () {
          return ['backupsomething'];
        }
        chai.expect(subject()).to.not.have.property('backupsomething');
      });

      it("include keys with '.enabled'", function () {
        this.module().default.getAllCliqzPrefs = function () {
          return ['lvl1.enabled'];
        }
        chai.expect(subject()).to.have.property('lvl1.enabled');
      });

      it("include multi-level keys with '.enabled'", function () {
        this.module().default.getAllCliqzPrefs = function () {
          return ['lvl1.enabled.lvl3.lvl4'];
        }
        chai.expect(subject()).to.have.property('lvl1.enabled.lvl3.lvl4');
      });

      it("include keys with 'enabled' in name", function () {
        this.module().default.getAllCliqzPrefs = function () {
          return ['value-enabled'];
        }
        chai.expect(subject()).to.have.property('value-enabled');
      });

      it("include keys with 'enabled' AND '.enabled'", function () {
        this.module().default.getAllCliqzPrefs = function () {
          return ['value-enabled.enabled'];
        }
        chai.expect(subject()).to.have.property('value-enabled.enabled');
      });

    });
  }
);
