/* global chai */
/* global describeModule */
/* global require */
const JSDOM = require('jsdom').jsdom;

export default describeModule('offers-v2/content/profile/serp',
  () => ({
  }),
  () => {
    describe('search result page detection', function () {
      let isSearchResultPage;

      beforeEach(function () {
        isSearchResultPage = this.module().isSearchResultPage;
      });

      context('isSearchResultPage', function () {
        it('/detect google serp', () => {
          const doc = new JSDOM(
            '<div jscontroller="iDPoPb" class="a4bIc" jsname="gLFyf" jsaction="dFyQEf;input:d3sQLd;focus:dFyQEf;blur:jI3wzf"><div class="vdLsw gsfi" jsname="vdLsw"></div><input class="gLFyf gsfi" maxlength="2048" name="q" type="text" jsaction="paste:puy29d" aria-autocomplete="both" aria-haspopup="false" autocapitalize="off" autocomplete="off" autocorrect="off" role="combobox" spellcheck="false" title="Suche" value="test" aria-label="Suche"></div>',
            { url: 'https://www.google.com/search?q=test&client=firefox-b&ei=9oN...jpNQ&start=10&sa=N&ved=0ahUKE...JsB&biw=1552&bih=418' }
          );

          const isSerp = isSearchResultPage(doc);

          chai.expect(isSerp).to.be.true;
        });

        it('/detect amazon serp', () => {
          const doc = new JSDOM(
            `<div class="nav-search-field ">
              <!-- DO NOT REMOVE: the text in the label are for screen reader, and it is not visible in the web page -->
              <label id="nav-search-label" for="twotabsearchtextbox" class="aok-offscreen">
                Suche
              </label>
              <input
                type="text"
                id="twotabsearchtextbox"
                value="kindle"
                name="field-keywords"
                autocomplete="off"
                placeholder=""
                class="nav-input"
                dir="auto"
                tabindex="9"
              >
            </div>`,
            { url: 'https://www.amazon.de/s/ref=nb_sb_noss_2?__mk_de_DE=%C3%85M%C3%85%C5%BD%C3%95%C3%91&url=search-alias%3Daps&field-keywords=kindle' }
          );

          const isSerp = isSearchResultPage(doc);

          chai.expect(isSerp).to.be.true;
        });

        it('/detect ebay serp', () => {
          const doc = new JSDOM(
            '<div id="gh-ac-box"><div id=gh-ac-box2><label for=gh-ac class="gh-ar-hdn">Geben Sie Ihren Suchbegriff ein</label><input type="text" class="gh-tb ui-autocomplete-input" size="50" maxlength="300" placeholder="Was suchen Sie?" id="gh-ac" name="_nkw" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off" value="chocolate"></div></div>',
            { url: 'https://www.ebay.de/sch/i.html?_from=R40&_trksid=m570.l1313&_nkw=chocolate&_sacat=0' }
          );

          const isSerp = isSearchResultPage(doc);

          chai.expect(isSerp).to.be.true;
        });

        it('/false if: no input-text fields', () => {
          const doc = new JSDOM(
            '<div><input type="textarea"></div>',
            { url: 'https://www.google.com/search?q=test' }
          );

          const isSerp = isSearchResultPage(doc);

          chai.expect(isSerp).to.be.false;
        });

        it('/false if: name of input-text not found in the url', () => {
          const doc = new JSDOM(
            '<div><input type="text" name="qqq"></div>',
            { url: 'https://www.google.com/search?ccc=test' }
          );

          const isSerp = isSearchResultPage(doc);

          chai.expect(isSerp).to.be.false;
        });

        it('/check several input-text fields', () => {
          const doc = new JSDOM(
            '<div><input type="text" name="f1"><input type="text" name="f2"><input type="text" name="f3"></div>',
            { url: 'https://www.google.com/search?f2=test' }
          );

          const isSerp = isSearchResultPage(doc);

          chai.expect(isSerp).to.be.true;
        });

        it('/support input-search field', () => {
          const doc = new JSDOM(
            `<div id="simpleSearch">
              <input type="search" name="search" placeholder="Wikipedia durchsuchen" title="Durchsuche die Wikipedia [f]" accesskey="f" id="searchInput"/><input type="hidden" value="Spezial:Suche" name="title"/><input type="submit" name="fulltext" value="Suchen" title="Suche nach Seiten, die diesen Text enthalten" id="mw-searchButton" class="searchButton mw-fallbackSearchButton"/><input type="submit" name="go" value="Artikel" title="Gehe direkt zu der Seite mit genau diesem Namen, falls sie vorhanden ist." id="searchButton" class="searchButton"/>
            </div>
            `,
            { url: 'https://de.wikipedia.org/w/index.php?search=gr%C3%B6%C3%9Fte+St%C3%A4dte&title=Spezial%3ASuche&go=Artikel' }
          );

          const isSerp = isSearchResultPage(doc);

          chai.expect(isSerp).to.be.true;
        });

        it('/check word "search" in page title', () => {
          const doc = new JSDOM(
            `<html lang=""de"><head><meta charset=""UTF-8">
               <meta http-equiv=""content-type" content="text/html; charset=UTF-8">
               <title>Suchergebnisse</title>
              </head>
              <body><input class="search_form_field" type="search" name="search_keywords" id="search_keywords" value="" maxlength="100" placeholder="Suchen"></body>
            </html>`,
            { url: 'https://www.endpointprotector.de/search' }
          );

          const isSerp = isSearchResultPage(doc);

          chai.expect(isSerp).to.be.true;
        });
      });
    });
  });
