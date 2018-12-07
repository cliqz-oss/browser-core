/* global chai, describeModule */

const mock = {
  'search/operators/links/utils': {
    getMainLink: url => ({ url }),
  },
};

export default describeModule('search/operators/responses/smooth-responses',
  () => mock,
  () => {
    describe('#smoothResponses', function () {
      let smoothResponses;
      const config = {
        operators: {
          responses: {
            smoothResponses: {
              isEnabled: true,
            },
          },
        },
      };

      beforeEach(function () {
        smoothResponses = this.module().default;
      });

      it('keeps results that are in old but not in new reponse', function () {
        const oldResponse = {
          results: [
            'https://cliqz.com',
            'https://ghostery.com',
          ],
        };
        const newResponse = {
          results: [
            'https://cliqz.com',
          ],
        };

        const smoothedNewResponse = smoothResponses(oldResponse, newResponse, config);
        chai.expect(smoothedNewResponse.results).to.have.ordered.members([
          'https://cliqz.com',
          'https://ghostery.com',
        ]);
      });

      it('ignores missing old response', function () {
        const oldResponse = undefined;
        const newResponse = {
          results: [
            'https://cliqz.com',
          ],
        };

        const smoothedNewResponse = smoothResponses(oldResponse, newResponse, config);
        chai.expect(smoothedNewResponse.results).to.have.ordered.members([
          'https://cliqz.com',
        ]);
      });

      it('handles empty old response', function () {
        const oldResponse = { results: [] };
        const newResponse = {
          results: [
            'https://cliqz.com',
          ],
        };

        const smoothedNewResponse = smoothResponses(oldResponse, newResponse, config);
        chai.expect(smoothedNewResponse.results).to.have.ordered.members([
          'https://cliqz.com',
        ]);
      });

      it('handles empty new response', function () {
        const oldResponse = {
          results: [
            'https://cliqz.com',
          ],
        };
        const newResponse = { results: [] };

        const smoothedNewResponse = smoothResponses(oldResponse, newResponse, config);
        chai.expect(smoothedNewResponse.results).to.have.ordered.members([
          'https://cliqz.com',
        ]);
      });

      it('respects config', function () {
        config.operators.responses.smoothResponses.isEnabled = false;
        const oldResponse = {
          results: [
            'https://cliqz.com',
          ],
        };
        const newResponse = { results: [] };

        const smoothedNewResponse = smoothResponses(oldResponse, newResponse, config);
        chai.expect(smoothedNewResponse.results).to.be.empty;
      });
    });
  });
