/* global chai */
/* global describeModule */
/* eslint-disable func-names */


export default describeModule('market-analysis/common/session_checker',
  () => ({
    'market-analysis/common/logger': {
      default: {
        log: () => {},
        debug: () => {},
        logObject: () => {},
        error: (msg) => { throw new Error(msg); }
      }
    }
  }),
  () => {
    describe('test function', () => {
      let SessionChecker;
      let MAMetrics;

      beforeEach(function () {
        return this.system.import('market-analysis/model/ma_signal').then((mod) => {
          MAMetrics = mod.MAMetrics;
        })
          .then(() => { SessionChecker = this.module().default; });
      });

      it('check isNewSession function - metrics for 30 min session', () => {
        const metrics = [
          MAMetrics.VISIT,
          MAMetrics.REGISTRATION,
          MAMetrics.SHOPPING,
          MAMetrics.CHECKOUT,
          MAMetrics.TRANSACTION
        ];

        metrics.forEach((metric) => {
          const sessionChecker = new SessionChecker();
          sessionChecker.toString();
          const domain = 'amazon.de';
          const domain2 = 'ebay.de';

          const visitDate = new Date();
          chai.expect(sessionChecker.isNewSession(domain, metric, visitDate)).eql(true);

          visitDate.setMinutes(visitDate.getMinutes() + 1);
          chai.expect(sessionChecker.isNewSession(domain, metric, visitDate)).eql(false);

          visitDate.setMinutes(visitDate.getMinutes() + 29);
          chai.expect(sessionChecker.isNewSession(domain, metric, visitDate)).eql(false);

          visitDate.setMinutes(visitDate.getMinutes() + 30);
          chai.expect(sessionChecker.isNewSession(domain, metric, visitDate)).eql(true);

          visitDate.setMinutes(visitDate.getMinutes() + 5);
          chai.expect(sessionChecker.isNewSession(domain, metric, visitDate)).eql(false);

          sessionChecker.isNewSession(domain2, metric, visitDate);
          chai.expect(sessionChecker.domainToLastVisit.size).eql(2);
        });
      });
    });
  });
