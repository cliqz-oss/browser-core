/* global chai */
/* global describeModule */

const commonMocks = require('../utils/common');

export default describeModule('offers-v2/common/url_data',
  () => ({
    ...commonMocks,
  }),
  () => {
    describe('rewrite Google serp url', () => {
      let UrlData;

      beforeEach(function () {
        UrlData = this.module().default;
      });

      it('/rewrite', () => {
        const url1 = 'https://www.GoOgLe.com/search?client=firefox-b-d&q=%6captop+kaufen';
        const url2 = 'https://www.GoOgLe.com/search?client=firefox-b-d&query=%6captop+kaufen';

        const newUrl1 = UrlData._rewriteGoogleSerpUrl(url1);
        const newUrl2 = UrlData._rewriteGoogleSerpUrl(url2);

        const expectedUrl = 'https://www.GoOgLe.com/search?q=%6captop+kaufen';
        chai.expect(newUrl1).to.eq(expectedUrl);
        chai.expect(newUrl2).to.eq(expectedUrl);
      });

      it('/retain url if not a google domain', () => {
        const url = 'https://www.nota.google.xxx.com/search?client=firefox-b-d&q=laptop+kaufen';

        const newUrl = UrlData._rewriteGoogleSerpUrl(url);

        chai.expect(newUrl).to.eq(url);
      });

      it('/retain url if not a search path', () => {
        const url = 'https://www.google.com/SEARCH?client=firefox-b-d&q=laptop+kaufen';

        const newUrl = UrlData._rewriteGoogleSerpUrl(url);

        chai.expect(newUrl).to.eq(url);
      });

      it('/retain url if no search parameter', () => {
        const url = 'https://www.google.com/search?client=firefox-b-d&Q=laptop+kaufen';

        const newUrl = UrlData._rewriteGoogleSerpUrl(url);

        chai.expect(newUrl).to.eq(url);
      });

      it('/retain url if no search string at all', () => {
        const url = 'https://www.google.com/search';

        const newUrl = UrlData._rewriteGoogleSerpUrl(url);

        chai.expect(newUrl).to.eq(url);
      });
    });
  });
