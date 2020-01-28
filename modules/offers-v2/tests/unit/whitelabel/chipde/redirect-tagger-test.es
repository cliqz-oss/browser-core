/* global chai */
/* global describeModule */
/* global sinon */

const commonMocks = require('../../utils/common');
const { doRedirects, urls } = require('./redirect');

export default describeModule('offers-v2/whitelabel/chipde/redirect-tagger',
  () => ({
    ...commonMocks,
  }),
  () => {
    describe('chip.de redirect tagger', function () {
      context('/main', () => {
        let redirectTagger;
        const onFinalDomain = sinon.stub();

        beforeEach(async function () {
          const RedirectTagger = this.module().default;
          onFinalDomain.reset();
          redirectTagger = new RedirectTagger(sinon.stub(), onFinalDomain);
        });

        function getReferrerMap() {
          return redirectTagger.referrers.toMap();
        }

        it('/find final destination', () => {
          doRedirects(urls.defaultChain, redirectTagger.onRequest);

          chai.expect(onFinalDomain).to.be.calledWith('mediamarkt.de');
        });

        it('/track only x.chip.de redirects', () => {
          // this chain doesn't containt x.chip.de site
          const chain = [urls.hop2, urls.hop3, urls.hop4, urls.hop5, urls.target];

          doRedirects(chain, redirectTagger.onRequest);

          chai.expect(onFinalDomain).to.be.not.called;
          chai.expect(getReferrerMap()).to.be.empty;
        });
      });
    });
  });
