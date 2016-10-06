export default describeModule('mobile-history/history',
  function () {
    return {
      'core/utils': { default: { } },
      'core/templates': { default: { tplCache: { } } },
      'mobile-history/webview': { 
        document: { 
          body: { }, 
          documentElement: { }, 
          getElementById() { return { addEventListener() { } }; } 
        } 
      },
      'mobile-touch/longpress': { default() { } }
    };
  },
  function () {
    let _done;
    beforeEach(function () {
      this.module().default.displayData = data => this.module().default.sendShowTelemetry(data); 
      this.deps('core/utils').default.getLocalStorage = _  => { 
        return { getObject() { return []; } };
      };
      this.deps('core/utils').default.telemetry = msg => {
        chai.expect(msg).to.be.ok;
        chai.expect(msg.action).to.equal('show');
        _done();
      };
      this.deps('core/templates').default.tplCache.conversations = _ => {}
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