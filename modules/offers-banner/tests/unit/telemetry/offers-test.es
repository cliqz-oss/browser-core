/* global chai */
/* global describeModule */
/* global sinon */

const { RAW_RESULT, CURRENT_RESULTS, CURRENT_RESULTS_ONLY_HSE_OFFER, HSE_OFFER } = require('./fixture');

export default describeModule('offers-banner/search/offers',
  () => ({
  }),
  () => {
    describe('/dropdown telemetry offers', function () {
      let reporter;
      const actionMock = sinon.stub();

      beforeEach(function () {
        const OffersReporter = this.module().default;
        actionMock.reset();
        reporter = new OffersReporter({ action: actionMock });
      });

      it('/register an offer on show', async () => {
        reporter.registerResults(CURRENT_RESULTS_ONLY_HSE_OFFER);

        await reporter.reportShows(CURRENT_RESULTS_ONLY_HSE_OFFER);

        chai.expect(actionMock.firstCall.args).to.eql([
          'createExternalOffer',
          {
            origin: 'dropdown',
            data: HSE_OFFER,
          }
        ]);
      });

      it('/register an offer on click', async () => {
        reporter.registerResults(CURRENT_RESULTS_ONLY_HSE_OFFER);

        await reporter.reportClick(CURRENT_RESULTS_ONLY_HSE_OFFER, RAW_RESULT);

        chai.expect(actionMock.firstCall.args).to.eql([
          'createExternalOffer',
          {
            origin: 'dropdown',
            data: HSE_OFFER,
          }
        ]);
      });

      function getCallsWithCreateExternalOffer() {
        return actionMock.args.filter(([msg]) => msg === 'createExternalOffer');
      }

      it('/register several shown offers', async () => {
        reporter.registerResults(CURRENT_RESULTS);

        await reporter.reportShows(CURRENT_RESULTS); // 2 offers inside

        chai.expect(getCallsWithCreateExternalOffer()).to.have.length(2);
      });

      it('/register an offer only once', async () => {
        reporter.registerResults(CURRENT_RESULTS_ONLY_HSE_OFFER);
        await reporter.reportShows(CURRENT_RESULTS_ONLY_HSE_OFFER);

        await reporter.reportClick(CURRENT_RESULTS_ONLY_HSE_OFFER, RAW_RESULT);
        await reporter.reportShows(CURRENT_RESULTS_ONLY_HSE_OFFER);
        await reporter.reportClick(CURRENT_RESULTS_ONLY_HSE_OFFER, RAW_RESULT);

        chai.expect(getCallsWithCreateExternalOffer()).to.have.length(1);
      });

      it('/register an offer again after reset', async () => {
        reporter.registerResults(CURRENT_RESULTS_ONLY_HSE_OFFER);
        await reporter.reportShows(CURRENT_RESULTS_ONLY_HSE_OFFER);
        chai.expect(getCallsWithCreateExternalOffer()).to.have.length(1);
        await reporter.reportShows(CURRENT_RESULTS_ONLY_HSE_OFFER);
        chai.expect(getCallsWithCreateExternalOffer()).to.have.length(1); // not called again

        reporter.registerResults(CURRENT_RESULTS_ONLY_HSE_OFFER);
        await reporter.reportShows(CURRENT_RESULTS_ONLY_HSE_OFFER);

        chai.expect(getCallsWithCreateExternalOffer()).to.have.length(2); // called again
      });
    });
  });
