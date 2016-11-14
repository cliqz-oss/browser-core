export default describeModule("telemetry/aggregators/base",
  function () {
    return { }
  },
  function () {
    var aggregator;
    beforeEach(function() {
      const Aggregator = this.module().default;
      aggregator = new Aggregator();
    });
    describe("#getAllKeys", function () {
      it("empty list", function () {
        const keys = aggregator.getAllKeys([]);
        chai.expect(keys).to.be.empty;
      });
      it("1 empty object", function () {
        const keys = aggregator.getAllKeys([{ }]);
        chai.expect(keys).to.be.empty;
      });
      it("1 object with 1 key", function () {
        const keys = aggregator.getAllKeys([{ key_1: 0 }]);
        chai.expect(keys.size).to.be.equal(1);
        chai.expect(keys.has('key_1')).to.be.true;
      });
      it("1 object with 2 keys", function () {
        const keys = aggregator.getAllKeys([{ key_1: 0, key_2: 0 }]);
        chai.expect(keys.size).to.be.equal(2);
        chai.expect(keys.has('key_1')).to.be.true;
        chai.expect(keys.has('key_2')).to.be.true;
      });
      it("2 objects with same key", function () {
        const keys = aggregator.getAllKeys([{ key_1: 0}, {key_1: 0 }]);
        chai.expect(keys.size).to.be.equal(1);
        chai.expect(keys.has('key_1')).to.be.true;
      });
      it("2 objects with different keys", function () {
        const keys = aggregator.getAllKeys([{ key_1: 0}, {key_2: 0 }]);
        chai.expect(keys.size).to.be.equal(2);
        chai.expect(keys.has('key_1')).to.be.true;
        chai.expect(keys.has('key_2')).to.be.true;
      });
      it("blacklist with 1 element", function () {
        const keys = aggregator.getAllKeys(
          [{ key_1: 0}, {key_2: 0 }],
          { blacklist: ['key_1'] });
        chai.expect(keys.size).to.be.equal(1);
        chai.expect(keys.has('key_1')).to.be.false;
        chai.expect(keys.has('key_2')).to.be.true;
      });
    });
  }
)
