/* global chai */
/* global describeModule */
const commonMocks = require('../utils/common');
const fetchMocks = require('../utils/fetch');
const persistenceMocks = require('../utils/persistence');
const VALID_OFFER_OBJ = require('../utils/offers/data').VALID_OFFER_OBJ;

const okUrl = 'http://ok';
const failUrl = 'fake://?status=404';
const fetchMock = fetchMocks['platform/fetch'].fetch;
fetchMock.mock(okUrl, {
  body: 'some data',
  headers: { 'Content-type': 'image/smth' },
});
const encodedImage = 'data:image/smth;base64,c29tZSBkYXRh'; // base64('some data')

const url1 = 'http://cdn.cliqz.com/img-1';
const dataurl1 = 'dataurl://for-img-1';

function storeOffer(odb, oid, templateProperties) {
  const o = JSON.parse(JSON.stringify(VALID_OFFER_OBJ));
  o.offer_id = oid;
  Object.assign(o.ui_info.template_data, templateProperties);
  odb.addOfferObject(oid, o);
}

export default describeModule('offers-v2/offers/image-downloader',
  () => ({
    ...commonMocks,
    ...fetchMocks,
  }),
  () => {
    describe('/offers image downloader', function () {
      let imageDownloader;
      let odb;

      beforeEach(async function () {
        odb = await persistenceMocks.lib.getEmptyOfferDB(this.system, odb);
        const ImageDownloader = this.module().default;
        imageDownloader = new ImageDownloader(odb);
      });

      it('/find already downloaded image in logos', async () => {
        storeOffer(odb, 'oid', { logo_url: url1, logo_dataurl: dataurl1 });

        const du = await imageDownloader.processUrl(url1);

        chai.expect(du).to.eql(dataurl1);
      });

      it('/find already downloaded image in pictures', async () => {
        storeOffer(odb, 'oid', { picture_url: url1, picture_dataurl: dataurl1 });

        const du = await imageDownloader.processUrl(url1);

        chai.expect(du).to.eql(dataurl1);
      });

      it('/download image if not downloaded yet', async () => {
        storeOffer(odb, 'oid', { logo_url: okUrl, logo_dataurl: '' });

        const du = await imageDownloader.processUrl(okUrl);

        chai.expect(du).to.eql(encodedImage);
      });

      it('/avoid downloading if url is unknown', async () => {
        const du = await imageDownloader.processUrl('some-unknown-url');

        chai.expect(du).to.be.null;
      });

      it('/avoid downloading if no url is given', async () => {
        const emptyUrl = '';
        storeOffer(odb, 'oid', { logo_url: emptyUrl, logo_dataurl: emptyUrl });

        const du = await imageDownloader.processUrl(emptyUrl);

        chai.expect(du).to.be.null;
      });

      it('/catch download errors', async () => {
        storeOffer(odb, 'oid', { picture_url: failUrl });

        const du = await imageDownloader.processUrl(failUrl);

        chai.expect(du).to.be.null;
      });

      function extractPictureAndLogo(offerObj) {
        const tpl = offerObj.ui_info.template_data;
        const { picture_dataurl: picture, logo_dataurl: logo } = tpl;
        return { picture, logo };
      }

      it('/store a downloaded image in all offers that reference it', async () => {
        storeOffer(odb, 'oid1', { picture_url: url1 });
        storeOffer(odb, 'oid2', { picture_url: okUrl, logo_url: okUrl });
        storeOffer(odb, 'oid3', { picture_url: okUrl, logo_url: okUrl });
        storeOffer(odb, 'oid4', { picture_url: okUrl, logo_url: okUrl });

        await imageDownloader.processUrl(okUrl);

        odb.getOffers().forEach((offer) => {
          const offerId = offer.offer_id;
          const { picture, logo } = extractPictureAndLogo(offer.offer);
          if (offerId === 'oid1') {
            chai.expect(picture).to.be.undefined;
            chai.expect(logo).to.be.undefined;
          } else {
            chai.expect(picture).to.eq(encodedImage);
            chai.expect(logo).to.eq(encodedImage);
          }
        });
      });

      // Disable until fix in core: do not hang on re-creating of `PersistentMap`
      xit('/stored images are persistent over browser restart', async () => {
        storeOffer(odb, 'oid', { picture_url: okUrl, logo_url: okUrl });

        await imageDownloader.processUrl(okUrl);
        await odb.loadPersistentData();

        const offer = odb.getOfferObject('oid');
        const { picture, logo } = extractPictureAndLogo(offer);
        chai.expect(picture).to.eq(encodedImage);
        chai.expect(logo).to.eq(encodedImage);
      });
    });
  });
