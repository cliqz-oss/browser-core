/* global chai */
/* global describeModule */
/* global require */
const { JSDOM } = require('jsdom');

export default describeModule('offers-v2/content/coupon/utils',
  () => ({
  }),
  () => {
    describe('coupon utils', function () {
      let walkDomTreeDepthFirst;

      beforeEach(function () {
        walkDomTreeDepthFirst = this.module().walkDomTreeDepthFirst;
      });

      context('/walk DOM tree', () => {
        function trackPath(node, path) {
          if (node.tagName) {
            path.push(node.tagName);
          }
          return node.className !== 'skip';
        }

        it('/visit only one node', () => {
          const jsdom = new JSDOM('<div />');
          const div = jsdom.window.document.getElementsByTagName('div')[0];

          const path = [];
          walkDomTreeDepthFirst(div, trackPath, path);

          chai.expect(path).to.eql(['DIV']);
        });

        it('/visit thin tree', () => {
          const jsdom = new JSDOM('<div><p></p><ul><lh></lh><li></li></ul></div>');
          const div = jsdom.window.document.getElementsByTagName('div')[0];

          const path = [];
          walkDomTreeDepthFirst(div, trackPath, path);

          chai.expect(path).to.eql(['DIV', 'P', 'UL', 'LH', 'LI']);
        });

        it('/visit thick tree', () => {
          const jsdom = new JSDOM(`<div>
              <p><b>1a</b><i>1b</i></p>
              <ul><lh>2a</lh><li>2b</li></ul>
            </div>`);
          const div = jsdom.window.document.getElementsByTagName('div')[0];

          const path = [];
          walkDomTreeDepthFirst(div, trackPath, path);

          chai.expect(path).to.eql(['DIV', 'P', 'B', 'I', 'UL', 'LH', 'LI']);
        });

        it('/do not visit a subtree', () => {
          const jsdom = new JSDOM('<div><p><a>a</a></p><p class="skip"><b>1a</b></p></div>');
          const div = jsdom.window.document.getElementsByTagName('div')[0];

          const path = [];
          walkDomTreeDepthFirst(div, trackPath, path);

          chai.expect(path).to.eql(['DIV', 'P', 'A', 'P']);
        });
      });
    });
  });
