/* global chai */
/* global describeModule */
const JSDOM = require('jsdom').jsdom;
const commonMocks = require('../utils/common');


export default describeModule('offers-v2/offers/dynamic-offer',
  () => ({
    ...commonMocks,
  }),
  () => {
    describe('/dynamic offer extract query', function () {
      let guessQuery;
      let getResultCountFromText;
      beforeEach(function () {
        guessQuery = this.module()._guessQuery;
        getResultCountFromText = this.module()._getResultCountFromText;
      });

      it('/Extract query from search url', () => {
        const nUrl = 'https://www.google.com/search?client=firefox-b-ab&ei=WxQ2XN5zzoPV8A_q7oeQCA&q=blumen kaufen münchen&oq=blumen+kaufen+&gs_l=psy-ab.3.0.0l3j0i67j0l6.3663.3663..5595...0.0..0.107.107.0j1......0....1..gws-wiz.......0i71.a3GKFs495tE';
        const pattern = 'blumen kaufen$fuzzy,script,domain=bing.de|google.com|google.de';
        const query = guessQuery(nUrl, pattern);

        chai.expect(query).to.eql('blumen kaufen münchen');
      });
      it('/Extract query from search url - end of url', () => {
        const nUrl = 'https://www.google.com/search?client=firefox-b-ab&ei=WxQ2XN5zzoPV8A_q7oeQCA&q=blumen kaufen münchen';
        const pattern = 'blumen kaufen$fuzzy,script,domain=bing.de|google.com|google.de';
        const query = guessQuery(nUrl, pattern);

        chai.expect(query).to.eql('blumen kaufen münchen');
      });
      it('/Extract query from search url - different order', () => {
        const nUrl = 'https://www.google.com/search?client=firefox-b-ab&ei=WxQ2XN5zzoPV8A_q7oeQCA&q=münchen kaufen blumen';
        const pattern = 'blumen kaufen$fuzzy,script,domain=bing.de|google.com|google.de';
        const query = guessQuery(nUrl, pattern);

        chai.expect(query).to.eql('münchen kaufen blumen');
      });
      it('/Extract query from search url - path', () => {
        const nUrl = 'https://www.google.com/search/blumen kaufen münchen/';
        const pattern = 'blumen kaufen$fuzzy,script,domain=bing.de|google.com|google.de';
        const query = guessQuery(nUrl, pattern);

        chai.expect(query).to.eql('blumen kaufen münchen');
      });
      it('/Extract query from search url - hash', () => {
        const nUrl = 'https://www.google.com/search/#blumen kaufen münchen';
        const pattern = 'blumen kaufen$fuzzy,script,domain=bing.de|google.com|google.de';
        const query = guessQuery(nUrl, pattern);

        chai.expect(query).to.eql('blumen kaufen münchen');
      });
      it('/Extract query from search url - pick longest match', () => {
        const nUrl = 'https://www.google.com/search/blumen?q=blumen kaufen münchen';
        const pattern = 'blumen kaufen$fuzzy,script,domain=bing.de|google.com|google.de';
        const query = guessQuery(nUrl, pattern);

        chai.expect(query).to.eql('blumen kaufen münchen');
      });
      it('/Evaluate result page', () => {
        const mockDom = new JSDOM(`<html><body><h1 class="pop-main__title">
          Suchergebnis für "zombiehöhle"
          </h1 >
          <span id="tau-pop-main-title-count"
          class="pop-main__title-count">( 0 Artikel)</span>
          </div >
          <div class="pop-main__empty-filtering-and-search-msg js-empty-search">
          </div></body></html>`);
        chai.expect(getResultCountFromText(mockDom.body.textContent, 'zombiehöhle')).to.eql(0);
      });
      it('/Evaluate result page 10 results', () => {
        const mockDom = new JSDOM(`<html><body><h1 class="pop-main__title">
          Suchergebnis für "zombiehöhle"
          </h1 >
          <span id="tau-pop-main-title-count"
          class="pop-main__title-count">( 10 Artikel)</span>
          </div >
          <div class="pop-main__empty-filtering-and-search-msg js-empty-search"></div></body></html>`);
        const res = getResultCountFromText(mockDom.body.textContent, 'zombiehöhle');
        chai.expect(res).to.eql(10);
      });
      it('/Evaluate result page - Multiple "Artikel" appearances ', () => {
        const mockDom = new JSDOM(`<html><body>
          <div class="wishlistHeader">
            <span data-sly-call="" class="icon-check"></span>
              Artikel wurde dem Merkzettel hinzugefügt.
          </div>
          <div class="filterTopLine">
            <span class="resultCount">1329</span> Artikel zur Suche <span class="resultQuery">apple magic mouse</span>. <span class="hint hidden-xs">Liste weiter eingrenzen:</span>
          </div></body></html>`);
        const res = getResultCountFromText(mockDom.body.textContent, 'apple magic mouse');
        chai.expect(res).to.eql(1329);
      });
      it('/Evaluate result page - Query with numbers ', () => {
        const mockDom = new JSDOM(`<html><body>
          <div class="wishlistHeader">
            <span data-sly-call="" class="icon-check"></span>
              Artikel wurde dem Merkzettel hinzugefügt.
          </div>
          <div class="filterTopLine">
            zur Suche <span class="resultQuery">channel 5</span> <span class="resultCount">1329</span> Artikel. <span class="hint hidden-xs">Liste weiter eingrenzen:</span>
          </div></body></html>`);
        const res = getResultCountFromText(mockDom.body.textContent, 'channel 5');
        chai.expect(res).to.eql(1329);
      });
    });
  });
