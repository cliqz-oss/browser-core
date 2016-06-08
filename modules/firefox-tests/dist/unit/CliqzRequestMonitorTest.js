var expect = chai.expect;

TESTS.CliqzRequestMonitorTest = function (CliqzRequestMonitor) {

  describe("CliqzRequestMonitor", function () {
    var subject;

    beforeEach(function () {
      subject = new CliqzRequestMonitor();
    });

    it("has TTL set for 2 minutes", function () {
      expect(subject.TTL).to.equal(2 * 60 * 1000);
    });

    it("has HEALTH_LEVEL set to 80%", function () {
      expect(subject.HEALTH_LEVEL).to.equal(0.8);
    });

    describe("inHealth", function () {
      it("return false if there are more drops than HEALTH_LEVEL allows", function () {
        // 50% health
        subject.addRequest({ status: 200, readyState: 4, timestamp: +new Date() });
        subject.addRequest({ status: 400, readyState: 4, timestamp: +new Date() });

        expect(subject.inHealth()).to.equal(false);
      });

      it("returns true if there are less drops than HEALTH_LEVEL allows", function () {
        // 100% health
        subject.addRequest({ status: 200, readyState: 4, timestamp: +new Date() });
        expect(subject.inHealth()).to.equal(true);
      });

      it("returns true if there are no requests", function () {
        expect(subject.inHealth()).to.equal(true);
      });
    });

    describe("requests", function () {
      it("returns empty array if no requests", function () {
        expect(subject.requests()).to.eql([]);
      });

      it("returns array of requests that still have TTL", function () {
        var req = { timestamp: +new Date(), readyState: 4, status: 200 };
        subject.addRequest(req);
        expect(subject.requests()).to.eql([req]);
      });

      it("excludes 'dead' requests", function () {
        var req = { timestamp: new Date() - (2 * subject.TTL), readyState: 4, status: 200 };
        subject.addRequest(req);
        expect(subject.requests()).to.eql([]);
      });

      it("excludes requests that have not finished", function () {
        var req = { timestamp: +new Date() };
        subject.addRequest(req);
        expect(subject.requests()).to.eql([]);
      });

    });

    describe("addRequest", function () {
      var req = { timestamp: +new Date(), status: 200, readyState: 4 };

      it("populates requests registry", function () {
        expect(subject.requests()).to.have.length(0);

        subject.addRequest(req);

        expect(subject.requests()).to.have.length(1);
        expect(subject.requests()).to.eql([req]);
      });

    });

  });

};
