export default describeModule('mobile-history/history',
  function () {
    return {
      'mobile-touch/longpress': {
        default: { onTap() { }, onLongPress() { } }
      },
      'core/cliqz': { environment: { }, utils: { } }
    };
  },
  function () {
    let _done;
    beforeEach(function () {
      this.module().default.displayData = data => this.module().default.sendShowTelemetry(data); 
      this.deps('core/cliqz').environment.getLocalStorage = _  => { 
        return { getObject() { return []; } };
      };
      this.deps('core/cliqz').utils.telemetry = msg => {
          chai.expect(msg).to.be.ok;
          chai.expect(msg.action).to.equal('show');
          _done();
        };
    });
    describe('Telemetry', function () {
      it('Should send show telemetry signal for history', function (done) {
        _done = done;
        this.module().default.showHistory([]);
      });
      it('Should send show telemetry signal for favorites', function (done) {
        _done = done;
        this.module().default.showFavorites([]);
      });
    });
  }
);