TESTS.TelemetryTest = function (CliqzUtils) {
  describe('Telemetry', function(){
    this.retries(1);

    it('should send environment signal', function () {
      var signal = null;
      CliqzUtils.telemetry = function(data){
        signal = data;
      }
      CliqzUtils.getWindow().CLIQZ.Core.whoAmI(true);

      return waitFor(function () {
        return signal != null;
      }).then(function(){
        chai.expect(signal.type).to.equal('environment');
        chai.expect(signal.agent).to.contain('Mozilla');
        chai.expect(signal.version).to.exist;
        chai.expect(signal.prefs.session).to.exist;
        chai.expect(signal.prefs.config_location).to.exist;
      });
    });
  });
};
