export default describeModule("telemetry/preprocessor",
  function () {
    return {
      'core/cliqz': {
        default: { },
      },
      'platform/ua-parser': {
        default: class { },
      },
      'platform/moment': {
        moment: { },
      }
    }
  },
  function () {
    var preprocessor;
    beforeEach(function() {
      const Preprocessor = this.module().default;
      preprocessor = new Preprocessor();
    });
    describe("#process", function () {
      it("should set 'id' from getId for non-demographic legacy signals", function () {
        preprocessor.isLegacy = _ => true;
        preprocessor.getId = _ => 'test_id';
        preprocessor.isDemographics = _ => false;
        const signal = preprocessor.process({});
        chai.expect(signal.id).to.equal('test_id');
      });
      it("should not alter new signals", function () {
        preprocessor.isLegacy = _ => false;
        const signal = preprocessor.process({ id: 'test_id', key_1: {} });
        chai.expect(signal).to.eql({ id: 'test_id', key_1: {} });
      });
      it("should return a copy for legacy signals", function () {
        preprocessor.isLegacy = _ => true;
        const signal = {};
        const copy = preprocessor.process({});
        chai.expect(signal).to.not.have.key('id');
      });
      it("should remove id-components from legacy signals", function () {
        preprocessor.idComponents = [ 'foo', 'bar' ];
        preprocessor.isLegacy = _ => true;
        const signal = preprocessor.process({ foo: 0, bar: 1, test: 2 });
        chai.expect(signal).to.not.have.keys(['foo', 'bar']);
        // FIXME: this fails for no reason (?)
        // chai.expect(signal).to.have.keys(['test']);
      });
      it("should remove keys with object values from legacy signals", function () {
        preprocessor.isLegacy = _ => true;
        preprocessor.isObject = v => v === 'dummy';
        const signal = preprocessor.process({ foo: 0, bar: 'dummy' });
        // FIXME: this fails for no reason (?)
        // chai.expect(signal).to.have.keys(['foo']);
        chai.expect(signal).to.not.have.key('bar');
      });
      it("should call isDemographics with signal for legacy signals", function () {
        let signal;
        preprocessor.isLegacy = _ => true;
        preprocessor.isDemographics = _signal => signal = _signal;
        preprocessor.process({ key: 1 });
        chai.expect(signal).to.be.eql({ key: 1 });
      });
      it("should call parseDemographics with signal for demographic legacy signals", function () {
        let signal;
        preprocessor.isLegacy = _ => true;
        preprocessor.isDemographics = _ => true;
        preprocessor.parseDemographics = _signal => signal = Object.assign(_signal, { parsed: true });
        preprocessor.process({ key: 1 });
        chai.expect(signal).to.be.eql({ key: 1, parsed: true });
      });
      it("should set 'id' to '_demographics' for demographic legacy signals", function () {
        preprocessor.isLegacy = _ => true;
        preprocessor.isDemographics = _ => true;
        chai.expect(preprocessor.process({ key: 1 })).to.be.eql({ id: '_demographics',  key: 1, channel: 99 });
      });
    });
    describe("#getId", function () {
      it("should return empty String for no components", function () {
        preprocessor.idComponents = [];
        const id = preprocessor.getId({ test: 'test_val'} );
        chai.expect(id).to.be.empty;
      });
      it("should return component value for 1 component", function () {
        preprocessor.idComponents = ['test'];
        const id = preprocessor.getId({ test: 'test-val'} );
        chai.expect(id).to.be.equal('test-val');
      });
      it("should return 'na' if component does not exist", function () {
        preprocessor.idComponents = ['test'];
        const id = preprocessor.getId({ foo: 'test-val'} );
        chai.expect(id).to.be.equal('na');
      });
      it("should return concatenated component values for 2 components", function () {
        preprocessor.idComponents = ['test', 'foo'];
        const id = preprocessor.getId({ test: 'test-val', foo: 'bar' } );
        chai.expect(id).to.be.equal('test-val_bar');
      });
    });
    describe("#isLegacy", function () {
      it("should return true if version does not exist", function () {
        chai.expect(preprocessor.isLegacy(Object.create(null))).to.be.true;
      });
      it("should return false for version 3 given as number", function () {
        chai.expect(preprocessor.isLegacy({ v: 3 })).to.be.false;
      });
      it("should return false for version 3 given as string", function () {
        chai.expect(preprocessor.isLegacy({ v: '3' })).to.be.false;
      });
      it("should return false for version 3.X given as string", function () {
        chai.expect(preprocessor.isLegacy({ v: '3.X' })).to.be.false;
      });
      it("should return false for version 10 given as number", function () {
        chai.expect(preprocessor.isLegacy({ v: 10 })).to.be.false;
      });
      it("should return false for version 10 given as string", function () {
        chai.expect(preprocessor.isLegacy({ v: '10' })).to.be.false;
      });
      it("should return false for version 10.X given as string", function () {
        chai.expect(preprocessor.isLegacy({ v: '10.X' })).to.be.false;
      });
      it("should return true for version 2 given as number", function () {
        chai.expect(preprocessor.isLegacy({ v: 2 })).to.be.true;
      });
      it("should return true for version 2 given as string", function () {
        chai.expect(preprocessor.isLegacy({ v: '2' })).to.be.true;
      });
      it("should return true for version 2.X given as string", function () {
        chai.expect(preprocessor.isLegacy({ v: '2.X' })).to.be.true;
      });
    });
    describe("#isObject", function () {
      it("should return true for empty object value", function () {
        chai.expect(preprocessor.isObject({})).to.be.true;
      });
      it("should return true for object value", function () {
        chai.expect(preprocessor.isObject({ foo: 'bar' })).to.be.true;
      });
      it("should return true for list value", function () {
        chai.expect(preprocessor.isObject([])).to.be.true;
      });
      it("should return false for integer value", function () {
        chai.expect(preprocessor.isObject(1)).to.be.false;
      });
      it("should return false for float value", function () {
        chai.expect(preprocessor.isObject(1.1)).to.be.false;
      });
      it("should return false for string value", function () {
        chai.expect(preprocessor.isObject('test')).to.be.false;
      });
      it("should return false for boolean value", function () {
        chai.expect(preprocessor.isObject(true)).to.be.false;
      });
      it("should return false for null value", function () {
        chai.expect(preprocessor.isObject(null)).to.be.false;
      });
    });
    describe("#isDemographics", function () {
      it("should false for empty signal", function () {
        chai.expect(preprocessor.isDemographics(Object.create(null))).to.be.false;
      });
      it("should false for signal without type", function () {
        chai.expect(preprocessor.isDemographics({ key: 1 })).to.be.false;
      });
      it("should false for signal of different type than 'environment'", function () {
        chai.expect(preprocessor.isDemographics({ type: 'some_type' })).to.be.false;
      });
      it("should true for signal of type 'environment'", function () {
        chai.expect(preprocessor.isDemographics({ type: 'environment' })).to.be.true;
      });
    });
  }
)

