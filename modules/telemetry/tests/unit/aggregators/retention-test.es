export default describeModule("telemetry/aggregators/retention",
  function () {
    return { }
  },
  function () {
    var retention;
    beforeEach(function() {
      const Retention = this.module().default;
      retention = new Retention();
      retention.types = [];
    });
    describe("#aggregate", function () {
      it("should return no type data and `empty` set to false", function () {
        chai.expect(retention.aggregate({ type_1: [ { signal_key: 0 } ] }))
          .to.eql({ empty: false, types: { } });
      });
      it("should return type data set to true and `empty` set to false", function () {
        retention.types = ['type_1'];
        chai.expect(retention.aggregate({ type_1: [ { signal_key: 0 } ] }))
          .to.eql({ empty: false, types: { type_1: true } });
      });
      it("should return type data set to false and `empty` set to false", function () {
        retention.types = ['type_1'];
        chai.expect(retention.aggregate({ type_2: [ { signal_key: 0 } ] }))
          .to.eql({ empty: false, types: { type_1: false } });
      });
      it("should return type data set to false and `empty` set to true", function () {
        retention.types = ['type_1'];
        chai.expect(retention.aggregate({ type_1: [] }))
          .to.eql({ empty: true, types: { type_1: false } });
      });
      it("should return no type data and `empty` set to true", function () {
        chai.expect(retention.aggregate({ }))
          .to.eql({ empty: true, types: { } });
        chai.expect(retention.aggregate({ type_1: [] }))
          .to.eql({ empty: true, types: { } });
      });
    });
  }
)
