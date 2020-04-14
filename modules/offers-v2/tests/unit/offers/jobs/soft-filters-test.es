/* global chai */
/* global describeModule */
const commonMocks = require('../../utils/common');
const { VALID_OFFER_OBJ, VALID_OFFER_SUCCESS_URL } = require('../../utils/offers/data');

const clone = obj => JSON.parse(JSON.stringify(obj));
const getMonitor = (offer, sID) => offer.monitorData.find(({ signalID }) => signalID === sID);

export default describeModule('offers-v2/offers/jobs/soft-filters',
  () => commonMocks,
  () => {
    describe('/shouldTriggerOnAdvertiser', () => {
      let Offer;
      let UrlData;
      let shouldTriggerOnAdvertiser;

      beforeEach(async function () {
        Offer = (await this.system.import('offers-v2/offers/offer')).default;
        UrlData = (await this.system.import('offers-v2/common/url_data')).default;
        shouldTriggerOnAdvertiser = this.module().shouldTriggerOnAdvertiser;
      });

      it(`returns true when this offer's \`trigger_on_advertiser\` property is \`true\`
and when the given \`url\` (string or UrlData) matches this offer's page impression monitor pattern
if defined, false otherwise`,
      () => {
        const urls = ['https://another-unrelated-url.com', VALID_OFFER_SUCCESS_URL];
        const offerObj = clone(VALID_OFFER_OBJ);
        getMonitor(offerObj, 'success').signalID = 'page_imp';
        offerObj.trigger_on_advertiser = true;
        const offer = new Offer(offerObj);

        const results = urls.flatMap(url => [
          shouldTriggerOnAdvertiser(offer, url),
          shouldTriggerOnAdvertiser(offer, new UrlData(url))
        ]);

        chai.expect(results).to.deep.eq([false, false, true, true]);
      });
    });
  });
