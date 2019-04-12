/* global chai */
/* global describeModule */
/* global require */
const JSDOM = require('jsdom').jsdom;

export default describeModule('offers-v2/content/profile/outgoing-link',
  () => ({
  }),
  () => {
    describe('classify outgoing links', function () {
      let classifyOutgoingLinks;

      beforeEach(function () {
        classifyOutgoingLinks = this.module().classifyOutgoingLinks;
      });

      context('classifyOutgoingLinks', function () {
        it('/return empty set for uninteresting domains', () => {
          const doc = new JSDOM('<a href="http://google.com"></a><a href="/local_page.html"></a><a href="http://www.yahoo.com"></a>');

          const cats = classifyOutgoingLinks(doc);

          chai.expect(cats).to.eql(new Set());
        });

        it('/detect amazon', () => {
          const doc = new JSDOM('<a href="https://www.amazon.de/dp/1617290890/"></a>');

          const cats = classifyOutgoingLinks(doc);

          chai.expect([...cats]).to.eql(['link-amazon']);
        });

        it('/detect ebay', () => {
          const doc = new JSDOM('<a href="https://www.ebay.com.au/sch/i.html?_from=R40&_trksid=m570.l1313&_nkw=kangaroo&_sacat=0&LH_TitleDesc=0&_odkw=kanger&_osacat=0"></a>');

          const cats = classifyOutgoingLinks(doc);

          chai.expect([...cats]).to.eql(['link-ebay']);
        });

        it('/detect both amazon and ebay', () => {
          const doc = new JSDOM(
            `<p>
              <a href="http://google.com"></a>
              <a href="http://amazon.de"></a><a href="http://ebay.com"></a>
              <a href="http://ebay.com"></a><a href="http://amazon.de"></a>
            </p>`
          );

          const cats = classifyOutgoingLinks(doc);

          chai.expect([...cats]).to.eql(['link-amazon', 'link-ebay']);
        });
      });
    });
  });
