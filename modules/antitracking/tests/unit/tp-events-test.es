/* global chai */
/* global describeModule */

const tldjs = require('tldjs');

const url = {
  toString: () => 'https://test.com/path?ref=cliqz.com/tracking',
  hostname: 'test.com',
  protocol: 'https',
  path: 'path',
}

const rediretUrl = {
  toString: () => 'https://test2.com/path?ref=cliqz.com/tracking',
  hostname: 'test2.com',
  protocol: 'https',
  path: 'path'
}

const tabID = 1;

function mockMd5(s) {
  return `md5:${s}`;
}

export default describeModule("antitracking/tp_events",
  () => ({
    'platform/browser': {},
    'core/cliqz': { utils: { log: console.log } },
    'platform/lib/tldjs': {
      default: tldjs,
    },
    'core/config': {
      default: { settings: {} }
    },
    'core/utils': {
      default: {}
    },
    'core/resource-loader': {
      default: {}
    },
    'core/events': {
      default: {}
    },
    'core/persistent-state': {
      default: {}
    },
    'core/helpers/md5': {
      default: mockMd5
    },
    'core/encoding': {},
    'core/gzip': {},
  }),
  function () {
    describe('tp events log placeHolder in url', function() {
      let PageEventTracker;

      beforeEach(function() {
        PageEventTracker = this.module().default;
      });

      it('log full page load', () => {
        const tpEvents = new PageEventTracker(
          null,
          { placeHolder: 'cliqz.com/antitracking' }
        );

        tpEvents.onFullPage(url, tabID, false);
        chai.expect(Object.keys(tpEvents._active).length).to.equal(1);
        chai.expect(tpEvents._active[tabID].placeHolder).to.equal(true);
      });

      it('log redirects', () => {
        const tpEvents = new PageEventTracker(
          null,
          { placeHolder: 'cliqz.com/antitracking' }
        );
        tpEvents.onFullPage(url, tabID, false);
        tpEvents.onRedirect(rediretUrl, tabID, false);
        chai.expect(Object.keys(tpEvents._active).length).to.equal(1);
        chai.expect(tpEvents._active[tabID].placeHolder).to.equal(true);
        chai.expect(tpEvents._active[tabID].redirectsPlaceHolder).to.eql([true]);
      });

      it('exists in plainobject', () => {
        const tpEvents = new PageEventTracker(
          null,
          { placeHolder: 'cliqz.com/antitracking' }
        );
        tpEvents.onFullPage(url, tabID, false);
        tpEvents.onRedirect(rediretUrl, tabID, false);
        chai.expect(Object.keys(tpEvents._active).length).to.equal(1);
        const plainObject = tpEvents._active[tabID].asPlainObject();
        chai.expect(plainObject.placeHolder).to.equal(true);
        chai.expect(plainObject.redirectsPlaceHolder).to.eql([true]);
      });
    });

    describe('PageEventTracker', function() {
      let pageTracker;
      let URLInfo;

      beforeEach(function() {
        const PageEventTracker = this.module().default;
        pageTracker = new PageEventTracker(
          null,
          {
            placeHolder: 'cliqz.com/antitracking',
            tpDomainDepth: 1,
          }
        );
        return this.system.import('core/url-info').then((mod) => {
          URLInfo = mod.URLInfo;
        });
      });

      context('page added', () => {
        const tabId = 1;
        let pageUrl;

        beforeEach(() => {
          pageUrl = URLInfo.get('https://cliqz.com/user/cliqzer');
          pageTracker.onFullPage(pageUrl, tabId, false);
        });

        it('truncates the url path', () => {
          const page = pageTracker.getPageForTab(tabId);

          chai.expect(page.hostname).to.equal(pageUrl.hostname);
          chai.expect(page.path).to.equal(mockMd5('/user'));
          chai.expect(page.scheme).to.equal(pageUrl.protocol);
        });

        it('truncates the hostname when prepared for sending', () => {
          const plainPage = pageTracker.getPageForTab(tabId).asPlainObject();
          chai.expect(plainPage.hostname).to.equal(mockMd5(pageUrl.hostname));
        });

        it('isReferredFrom is true for itself', () => {
          const page = pageTracker.getPageForTab(tabId);
          chai.expect(page.isReferredFrom(pageUrl)).to.be.true;
        });

        context('.get', () => {
          let tpUrl;
          let tpCtr;

          beforeEach(() => {
            tpUrl = URLInfo.get('https://a.b.tracker.com/trackme.gif');
            tpCtr = pageTracker.get(tpUrl.url, tpUrl, pageUrl.url, pageUrl, tabId);
          });

          it('adds the third party to the page graph', () => {
            const page = pageTracker.getPageForTab(tabId);
            chai.expect(Object.keys(page.tps).length).equal(1);
            chai.expect(tpCtr).to.not.be.null;
          });

          it('truncates third party domain', () => {
            const page = pageTracker.getPageForTab(tabId);
            chai.expect(Object.keys(page.tps)).to.eql(['b.tracker.com']);
          });
        });
      });

    });
  }
);
