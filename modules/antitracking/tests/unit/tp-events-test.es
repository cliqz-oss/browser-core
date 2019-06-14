/* global chai */
/* global describeModule */
/* eslint no-param-reassign: off */

const tldts = require('tldts');
const punycode = require('punycode');

const url = {
  toString: () => 'https://test.com/path?ref=cliqz.com/tracking',
  hostname: 'test.com',
  protocol: 'https',
  pathname: 'path',
};

const rediretUrl = {
  toString: () => 'https://test2.com/path?ref=cliqz.com/tracking',
  hostname: 'test2.com',
  protocol: 'https',
  pathname: 'path'
};

const tabID = 1;

function mockMd5(s) {
  return `md5:${s}`;
}

export default describeModule('antitracking/tp_events',
  () => ({
    'platform/browser': {},
    'platform/lib/tldts': tldts,
    'core/console': {
      isLoggingEnabled() { return false; },
      default: {
        log() {}
      }
    },
    'core/config': {
      default: { settings: {} }
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
    'core/prefs': {
      default: {
        get() { return null; },
        set() {}
      }
    },
    'core/http': {
      fetch: () => Promise.reject(),
    },
    'platform/lib/punycode': {
      default: punycode,
    },
  }),
  function () {
    describe('tp events log placeHolder in url', function () {
      let PageEventTracker;

      beforeEach(function () {
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

    describe('PageEventTracker', function () {
      let pageTracker;
      let URLInfo;

      beforeEach(function () {
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
          chai.expect(page.scheme).to.equal(pageUrl.scheme);
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

    // tests migrated from firefox/chromium tests
    describe('tp_events', function () {
      let tp;
      let URLInfo;
      const config = {
        placeHolder: 'test',
      };

      beforeEach(async function () {
        const PageEventTracker = this.module().default;
        tp = new PageEventTracker(() => null, config);
        URLInfo = (await this.system.import('core/url-info')).URLInfo;
      });

      describe('onFullPage', () => {
        const mockTabId = 43;

        it("adds a tab to _active with request context's tab ID", function () {
          const urlParts = URLInfo.get('https://cliqz.com');
          const pageLoad = tp.onFullPage(urlParts, mockTabId);

          chai.expect(pageLoad).is.not.null;
          chai.expect(Object.keys(tp._active)).to.have.length(1);
          chai.expect(tp._active).to.have.property(mockTabId);
          chai.expect(tp._active[mockTabId].url).to.equal(urlParts.toString());
        });

        it('does not add a tab to _active if the url is malformed', function () {
          [null, undefined, 'http://cliqz.com', URLInfo.get('/home/cliqz'), URLInfo.get('about:config')].forEach(function (_url) {
            const pageLoad = tp.onFullPage(_url, mockTabId);

            chai.expect(pageLoad).is.null;
            chai.expect(Object.keys(tp._active)).to.have.length(0);
          });
        });

        it('does not add a tab to _active if the tab ID < 0', function () {
          const urlParts = URLInfo.get('https://cliqz.com');
          [null, undefined, -1].forEach(function (id) {
            const pageLoad = tp.onFullPage(urlParts, id);

            chai.expect(pageLoad).is.null;
            chai.expect(Object.keys(tp._active)).to.have.length(0);
          });
        });
      });

      describe('get', function () {
        const srcUrl = 'https://cliqz.com';
        let srcUrlParts;
        const _url = 'https://example.com/beacon';
        let urlParts;
        const mockTabId = 34;

        const testInvalidTabIds = function () {
          [undefined, null, 0, -1, 552].forEach(function (tabId) {
            const req = tp.get(_url, urlParts, srcUrl, srcUrlParts, tabId);
            chai.expect(req).to.be.null;
          });
        };

        describe('after page load', function () {
          let pageLoad;

          beforeEach(function () {
            srcUrlParts = URLInfo.get(srcUrl);
            urlParts = URLInfo.get(_url);
            pageLoad = tp.onFullPage(srcUrlParts, mockTabId);
          });

          it('returns a stats object for the specified page load and third party', function () {
            const req = tp.get(_url, urlParts, srcUrl, srcUrlParts, mockTabId);

            chai.expect(req).to.not.be.null;
            chai.expect(req.c).to.equal(0);
            chai.expect(pageLoad.tps).to.have.property(urlParts.hostname);
            chai.expect(pageLoad.tps[urlParts.hostname]).to.have.property(urlParts.path);
            chai.expect(pageLoad.tps[urlParts.hostname][urlParts.path]).to.equal(req);
          });

          it('returns null if source tab is invalid', testInvalidTabIds);
          it('returns null if third party referrer is not related to the page load', function () {
            const altUrl = 'https://www.w3.org/';
            const altUrlParts = URLInfo.get(altUrl);

            const req = tp.get(_url, urlParts, altUrl, altUrlParts, mockTabId);

            chai.expect(req).to.be.null;
          });

          it('third party referrer relation is transative', function () {
            const altUrl = 'https://www.w3.org/';
            const altUrlParts = URLInfo.get(altUrl);

            tp.get(_url, urlParts, srcUrl, srcUrlParts, mockTabId);
            const req = tp.get(altUrl, altUrlParts, _url, urlParts, mockTabId);

            chai.expect(req).to.not.be.null;
            chai.expect(req.c).to.equal(0);
            chai.expect(pageLoad.tps).to.have.property(urlParts.hostname);
            chai.expect(pageLoad.tps).to.have.property(altUrlParts.hostname);
            chai.expect(pageLoad.tps[altUrlParts.hostname]).to.have.property(altUrlParts.path);
            chai.expect(pageLoad.tps[altUrlParts.hostname][altUrlParts.path]).to.equal(req);
          });
        });

        it('returns null if onFullPage has not been called for the referrer', function () {
          const req = tp.get(_url, urlParts, srcUrl, srcUrlParts, mockTabId);

          chai.expect(req).to.be.null;
          chai.expect(tp._active).to.be.empty;
        });

        it('returns null if source tab is invalid', testInvalidTabIds);
      });

      describe('PageLoadData', function () {
        let pageLoad;
        const _url = 'https://cliqz.com/privacy#saferWeb';
        let urlParts;

        beforeEach(function () {
          urlParts = URLInfo.get(_url);
          pageLoad = tp.onFullPage(urlParts, 1);
        });

        it('should have initial attributes from source url', function () {
          chai.expect(pageLoad.url).to.equal(_url);
          chai.expect(pageLoad.hostname).to.equal(urlParts.hostname);
          chai.expect(pageLoad.tps).to.be.empty;
          chai.expect(pageLoad.path).to.equal(pageLoad._shortHash(urlParts.path));
        });

        describe('getTpUrl', function () {
          let tpUrl;

          beforeEach(function () {
            tpUrl = pageLoad.getTpUrl('hostname', '/');
          });

          it('should create a stat entry for the given page load', function () {
            chai.expect(pageLoad.tps).to.have.property('hostname');
            chai.expect(pageLoad.tps.hostname).to.have.property('/');
            chai.expect(pageLoad.tps.hostname['/']).to.equal(tpUrl);
          });

          it('should return the same object on repeated calls', function () {
            tpUrl.c += 1;

            chai.expect(pageLoad.getTpUrl('hostname', '/')).to.equal(tpUrl);
          });
        });

        describe('asPlainObject', function () {
          it('should contain page load metadata', function () {
            const plain = pageLoad.asPlainObject();
            chai.expect(plain).to.include.keys('hostname', 'path', 'c', 't', 'ra', 'tps');
          });

          it('should hash page load host', function () {
            const plain = pageLoad.asPlainObject();
            // md5('cliqz.com')
            chai.expect(plain.hostname).to.equal(mockMd5(pageLoad.hostname));
          });

          it('should sum third party stats', function () {
            const paths = ['script.js', 'beacon'];
            const tps = paths.map(function (p) {
              return pageLoad.getTpUrl('example.com', p);
            });
            tps.forEach(function (_tp) {
              _tp.c += 1;
            });

            const plain = pageLoad.asPlainObject();
            chai.expect(Object.keys(plain.tps)).to.have.length(1);
            chai.expect(plain.tps).to.have.property('example.com');
            chai.expect(plain.tps['example.com'].c).to.equal(2);
          });

          it('should prune all zero stats', function () {
            const paths = ['script.js', 'beacon'];
            const tps = paths.map(function (p) {
              return pageLoad.getTpUrl('example.com', p);
            });
            tps.forEach(function (_tp) {
              _tp.c += 1;
            });
            tps[1].has_qs = 1;

            const plain = pageLoad.asPlainObject();
            chai.expect(plain.tps['example.com']).to.eql({ c: 2, has_qs: 1 });
          });
        });
      });
    });
  });
