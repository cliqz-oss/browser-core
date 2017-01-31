export default describeModule("offers/rules/rule",
  function () {
    return {
    }
  },
  function () {
    describe("Rule", function () {
      const clusterID = "testid";
      let Rule;
      let rule;

      beforeEach(function () {
        Rule = this.module().Rule;
        rule = new Rule(clusterID);
      });

      describe("#constructor", function () {
        it("accepts clusterID and sets its as own property", function () {
          chai.expect(rule).to.have.property("cid", clusterID);
        });
      });

      describe("#clusterID", function () {
        it("returns clusterID", function () {
          chai.expect(rule.clusterID()).to.eql(clusterID);
        });
      });
    });
  }
);
