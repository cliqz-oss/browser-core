/* global chai */
/* global sinon */
/* global describeModule */
const commonMocks = require('../utils/common');
const fetchMocks = require('../utils/fetch');
const waitFor = require('../utils/waitfor');

const okUrl = 'http://ok';
const failUrl = 'fake://?status=404';
const fetchMock = fetchMocks['platform/fetch'].fetch;
fetchMock.mock(okUrl, {
  body: 'some data',
  headers: { 'Content-type': 'image/smth' },
});
const encodedImage = 'data:image/smth;base64,c29tZSBkYXRh'; // base64('some data')
let FALLBACK_IMAGE;

export default describeModule('offers-v2/offers/image-downloader',
  () => ({
    ...commonMocks,
    ...fetchMocks,
    'core/timers': {
      setTimeout: function () { },
    },
  }),
  () => {
    describe('/offers image downloader', function () {
      let ImageDownloaderPush;
      let ImageDownloaderDb;
      const cb = sinon.stub();

      beforeEach(function () {
        ImageDownloaderPush = this.module().ImageDownloaderForPush;
        ImageDownloaderDb = this.module().ImageDownloaderForOfferDB;
        FALLBACK_IMAGE = this.module().FALLBACK_IMAGE;
        cb.reset();
      });

      // --
      // Downloader for `push`
      //
      describe('/downloader for push', () => {
        let downloader;
        beforeEach(() => {
          downloader = new ImageDownloaderPush();
        });

        it('/download one image', async () => {
          await downloader.downloadWithinTimeLimit(okUrl, '', cb);

          const dataurl = cb.lastCall.lastArg;
          chai.expect(dataurl).to.eq(encodedImage);
        });

        it('/download if `dataurl` is not a data-url image but a real url', async () => {
          await downloader.downloadWithinTimeLimit(okUrl, okUrl, cb);

          const dataurl = cb.lastCall.lastArg;
          chai.expect(dataurl).to.eq(encodedImage);
        });

        it('/do not download already downloaded images', async () => {
          await downloader.downloadWithinTimeLimit(okUrl, encodedImage, cb);

          chai.expect(cb).to.have.not.been.called;
        });

        it('/do not download if no url', async () => {
          await downloader.downloadWithinTimeLimit('', '', cb);

          chai.expect(cb).to.have.not.been.called;
        });

        it('/exit on timeout, but still download images', async () => {
          // Stubbed `fetch` waits for timeout, and only then fetches
          let isAfterTimeout = false;
          const dl = new ImageDownloaderPush({
            setTimeout: c => c(),
            fetch: async (url) => {
              await waitFor(() => isAfterTimeout);
              return fetchMock(url);
            }
          });

          // Timeout before fetch
          // Callback is called with the original url
          await dl.downloadWithinTimeLimit(okUrl, '', cb);

          let dataurl = cb.lastCall.lastArg;
          chai.expect(dataurl).to.eq(okUrl);

          // Now comes fetch
          // Callback is called again, now with a real image
          cb.reset();
          isAfterTimeout = true;

          await waitFor(() => chai.expect(cb).to.have.been.called);
          dataurl = cb.lastCall.lastArg;
          chai.expect(dataurl).to.eq(encodedImage);
        });

        it('/use real url on download error', async () => {
          await downloader.downloadWithinTimeLimit(failUrl, '', cb);

          const dataurl = cb.lastCall.lastArg;
          chai.expect(dataurl).to.eq(failUrl);
        });

        it('/do not callback if dataurl is not changed', async () => {
          await downloader.downloadWithinTimeLimit(failUrl, failUrl, cb);

          chai.expect(cb).to.have.not.been.called;
        });
      });


      // --
      // Downloader for OfferDB
      //
      describe('/downloader for OfferDB', () => {
        let downloader;
        beforeEach(() => {
          downloader = new ImageDownloaderDb();
        });

        it('/download an image', async () => {
          await downloader.download(okUrl, '', cb);

          const dataurl = cb.lastCall.lastArg;
          chai.expect(dataurl).to.eq(encodedImage);
        });

        it('/fallback image on failure', async () => {
          await downloader.download(failUrl, 'not-a-data-url', cb);

          const dataurl = cb.lastCall.lastArg;
          chai.expect(dataurl).to.eq(FALLBACK_IMAGE);
        });

        it('/first call is setting a fallback url', async () => {
          await downloader.download(okUrl, okUrl, cb);

          const dataurl = cb.firstCall.lastArg;
          chai.expect(dataurl).to.eq(FALLBACK_IMAGE);
        });

        it('/first call is setting an original url, for transition between extension versions', async () => {
          await downloader.download(okUrl, null, cb);

          const dataurl = cb.firstCall.lastArg;
          chai.expect(dataurl).to.eq(okUrl);
        });

        it('/do not download if already downloaded', async () => {
          await downloader.download(okUrl, encodedImage, cb);

          chai.expect(cb).to.have.not.been.called;
        });

        it('/do not download if no url', async () => {
          await downloader.download('', '', cb);

          chai.expect(cb).to.have.not.been.called;
        });

        it('/do not callback if fallback dataurl is not changed', async () => {
          await downloader.download(failUrl, FALLBACK_IMAGE, cb);

          chai.expect(cb).to.have.not.been.called;
        });

        it('/do not download too often', async () => {
          const fetch = sinon.stub();
          const dl = new ImageDownloaderDb({ fetch });

          dl.nThreads = 1;
          dl.markBatch();
          await dl.download(okUrl, '', cb);

          chai.expect(fetch).to.have.not.been.called;
        });

        it('/do not mark batches if no active downloads', async () => {
          const fetch = sinon.stub();
          const dl = new ImageDownloaderDb({ fetch });

          dl.markBatch();
          dl.markBatch();
          dl.markBatch();
          await dl.download(okUrl, '', cb);

          chai.expect(fetch).to.have.been.called;
        });
      });
    });
  });
