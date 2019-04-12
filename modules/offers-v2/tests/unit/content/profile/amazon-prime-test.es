/* global chai */
/* global describeModule */
/* global require */
/* global sinon */

const MockBrowser = require('mock-browser').mocks.MockBrowser;

const PRIME_HTML = `
<header class = "nav-opt-sprite nav-locale-de nav-lang-de nav-ssl nav-rec">
  <div id='navbar' cel_widget_id='Navigation-desktop-navbar' role='navigation' class='nav-sprite-v1 celwidget nav-bluebeacon nav-subnav nav-packard-glow nav-a11y-c'>
  <div id='nav-belt'>
  <div class='nav-left'>
  <script type='text/javascript'>window.navmet.tmp=+new Date();</script>
<div id="nav-logo" class="nav-prime-1">
  <a href="/ref=nav_logo" class="nav-logo-link" aria-label="Amazon.de" tabindex="6">
    <span class="nav-sprite nav-logo-base"></span>
    <span class="nav-sprite nav-logo-ext"></span>
    <span class="nav-sprite nav-logo-locale"></span>
  </a>
  <a href="http://filled.by.browser.amazon.de/ref=nav_logo_prime" aria-label="Prime" class="nav-sprite nav-logo-tagline" tabindex="7">
  </a>
</div>
...</div></div></div></header> `;

const NOT_PRIME_HTML = `
<header class = "nav-opt-sprite nav-locale-us nav-lang-en nav-ssl nav-rec">
  <div id='navbar' cel_widget_id='Navigation-desktop-navbar' role='navigation' class='nav-sprite-v1 celwidget nav-bluebeacon nav-packard-glow nav-a11y-t1'>
  <div id='nav-belt'>
  <div class='nav-left'>
  <script type='text/javascript'>window.navmet.tmp=+new Date();</script>
  <script type='text/javascript'>window.navmet.push({key:'HamburgerMenuIcon',end:+new Date(),begin:window.navmet.tmp});</script>
  <script type='text/javascript'>window.navmet.tmp=+new Date();</script>
<div id="nav-logo" >
  <a href="/ref=nav_logo" class="nav-logo-link" aria-label="Amazon" tabindex="6">
    <span class="nav-sprite nav-logo-base"></span>
    <span class="nav-sprite nav-logo-ext"></span>
    <span class="nav-sprite nav-logo-locale"></span>
  </a>
</div>
<script type='text/javascript'>window.navmet.push({key:'Logo',end:+new Date(),begin:window.navmet.tmp});</script>
</div>
....
<!-- without href --> <a></a>
....</div></div></div></header> `;

export default describeModule('offers-v2/content/profile/amazon-prime',
  () => ({
  }),
  () => {
    describe('amazon prime detection', function () {
      context('report to background', () => {
        const actionMock = sinon.mock();
        let amazonPrimeDetection;

        beforeEach(function () {
          amazonPrimeDetection = this.module().default;
          actionMock.reset();
        });

        function visitPage(hostname, html) {
          let detectionFunc = () => {};
          //
          // Setup a mock browser. I can't find how to change `location`
          // of the object from `getWindow`, so `window` is mocked manually.
          //
          const doc = (new MockBrowser()).getDocument();
          doc.documentElement.innerHTML = html;
          const wnd = {
            location: { hostname },
            addEventListener: (_, func) => { detectionFunc = func; },
            removeEventListener: () => {},
            document: doc,
          };
          wnd.parent = wnd;
          const cliqzMock = { app: { modules: { 'offers-v2': { action: actionMock } } } };
          //
          // Reproduce content script workflow
          //
          amazonPrimeDetection(wnd, {}, cliqzMock);
          detectionFunc();
        }

        it('recognize amazon prime', () => {
          visitPage('www.amazon.com', PRIME_HTML);

          chai.expect(actionMock).to.be.calledWith(
            'learnTargeting', 'AmazonPrime'
          );
        });

        it('ignore non-prime content on amazon', () => {
          visitPage('www.amazon.de', NOT_PRIME_HTML);

          chai.expect(actionMock).to.be.not.called;
        });

        it('ignore prime html content collision on non-amazon domains', () => {
          visitPage('www.mein-amazon.de', PRIME_HTML);

          chai.expect(actionMock).to.be.not.called;
        });
      });
    });
  });
