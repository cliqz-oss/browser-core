export default describeModule("telemetry/aggregators/demographics",
  function () {
    return { }
  },
  function () {
    var demo;
    beforeEach(function() {
      const Demo = this.module().default;
      demo = new Demo();
    });
    describe("#aggregate", function () {
      it("should extract first demographics record", function () {
        const data = demo.aggregate({ _demographics: [ { key_1: 1, key_2: 2}, { key_1: 4, key_2: 5 } ] });
        chai.expect(data).to.eql({ key_1: '', key_2: '' });
      });
      it("should return empty object if no demographic key is found", function () {
        const data = demo.aggregate();
        chai.expect(data).to.be.empty;
      });
      it("should return empty object if no demographic data is found", function () {
        const data = demo.aggregate({ _demographics: [] });
        chai.expect(data).to.be.empty;
      });
      it("should anonymize values for key with a tree", function () {
        demo.trees = { key: { anonymize: x => x + 2 }};
        const data = demo.aggregate({ _demographics: [{ key: 1 }] });
        chai.expect(data.key).to.equal(3);
      });
      it("should anonymize values for keys with a tree", function () {
        demo.trees = { key_1: { anonymize: x => x + 10 }, key_2: { anonymize: x => x + 20 }};
        const data = demo.aggregate({ _demographics: [{ key_1: 1, key_2: 2 }] });
        chai.expect(data.key_1).to.equal(11);
        chai.expect(data.key_2).to.equal(22);
      });
      it("should remove value for key without a tree", function () {
        demo.trees = { other_key: { anonymize: x => x } };
        const data = demo.aggregate({ _demographics: [{ key: 1 }] });
        chai.expect(data.key).to.equal('');
      });
      it("should call trees with pre-defined k", function () {
        let k;
        demo.k = 100;
        demo.trees = { key: { anonymize: (_, _k) => k = _k } };
        const data = demo.aggregate({ _demographics: [{ key: 1 }] });
        chai.expect(k).to.equal(100);
      });
    });
  }
)
