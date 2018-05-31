/* global chai */
/* global describeModule */

const Rx = require('rxjs');
const fastUrlParser = require('fast-url-parser');
const tldjs = require('tldjs');

function mockSender(tab, url) {
  return {
    tab: {
      id: tab,
      url: url,
    }
  };
}

function delayedTest(test, done, delay) {
  setTimeout(() => {
    try {
      test();
      done()
    } catch(e) {
      done(e);
    }
  }, delay);
}

export default describeModule('antitracking/steps/oauth-detector',
  () => ({
    'platform/lib/rxjs': {
      default: Rx,
    },
    'core/helpers/md5': {},
    'platform/lib/tldjs': {
      default: tldjs,
    },
    'core/fast-url-parser': {
      default: fastUrlParser
    },
    'core/console': {
      default: console,
    }
  }),
  () => {
    describe('OAuthDetector', () => {
      let OAuthDetector;

      beforeEach(function initModule() {
        OAuthDetector = this.module().default;
      });

      describe('click tracking', () => {
        let events;
        let detectorInstance;

        beforeEach(function() {
          return this.system.import('core/events').then((mod) => {
            events = mod.default;
            detectorInstance = new OAuthDetector({ CLICK_TIMEOUT: 10 });
            detectorInstance.init();
          });
        });

        afterEach(function() {
          detectorInstance.unload();
        });

        it('registers clicks on tabs', (done) => {
          const tab = 5;
          const url = 'https://cliqz.com';
          const sender = mockSender(tab, url);
          events.pub('core:mouse-down', null, '', '', sender);
          delayedTest(() => {
            chai.expect(detectorInstance.clickActivity).to.eql({
              [tab]: url,
            });
          }, done, 5);
        });

        it('clicks in same tab overwrite', (done) => {
          const tab = 5;
          const url1 = 'https://cliqz.com';
          const url2 = 'https://ghostery.com';
          events.pub('core:mouse-down', null, '', '', mockSender(tab, url1));
          events.pub('core:mouse-down', null, '', '', mockSender(tab, url2));
          delayedTest(() => {
            chai.expect(detectorInstance.clickActivity).to.eql({
              [tab]: url2,
            });
          }, done, 5);
        });

        it('clicks different tabs', (done) => {
          const tab1 = 5;
          const tab2 = 6;
          const url1 = 'https://cliqz.com';
          const url2 = 'https://ghostery.com';
          events.pub('core:mouse-down', null, '', '', mockSender(tab1, url1));
          events.pub('core:mouse-down', null, '', '', mockSender(tab2, url2));
          delayedTest(() => {
            chai.expect(detectorInstance.clickActivity).to.eql({
              [tab1]: url1,
              [tab2]: url2,
            });
          }, done, 5);
        });

        it('clicks timeout', (done) => {
          const tab = 5;
          const url = 'https://cliqz.com';
          const sender = mockSender(tab, url);
          events.pub('core:mouse-down', null, '', '', sender);
          delayedTest(() => {
            chai.expect(detectorInstance.clickActivity).to.eql({})
          }, done, 15);
        });

        it('click timeout does not remove others', (done) => {
          const tab1 = 5;
          const tab2 = 6;
          const url1 = 'https://cliqz.com';
          const url2 = 'https://ghostery.com';
          events.pub('core:mouse-down', null, '', '', mockSender(tab1, url1));
          setTimeout(() => events.pub('core:mouse-down', null, '', '', mockSender(tab2, url2)), 10);
          delayedTest(() => {
            chai.expect(detectorInstance.clickActivity).to.eql({
              [tab2]: url2,
            });
          }, done, 15);
        });

        it('subsequent click refreshes timeout', (done) => {
          const tab1 = 5;
          const tab2 = 6;
          const url1 = 'https://cliqz.com';
          const url2 = 'https://ghostery.com';
          events.pub('core:mouse-down', null, '', '', mockSender(tab1, url1));
          events.pub('core:mouse-down', null, '', '', mockSender(tab2, url2))
          setTimeout(() => events.pub('core:mouse-down', null, '', '', mockSender(tab1, url1)), 10);
          delayedTest(() => {
            chai.expect(detectorInstance.clickActivity).to.eql({
              [tab1]: url1,
            });
          }, done, 15);
        });
      });

      describe('checkIsOAuth', () => {

        let URLInfo;
        let events;
        let detectorInstance;

        function mockState(tabId, url, sourceUrl, fullPage = false) {
          return {
            tabId,
            url,
            urlParts: URLInfo.get(url),
            sourceUrlParts: URLInfo.get(sourceUrl),
            isFullPage: () => fullPage,
            incrementStat: () => null,
          }
        }

        beforeEach(function() {
          return Promise.all([
            this.system.import('core/events'),
            this.system.import('core/url-info')]
          ).then((mods) => {
            events = mods[0].default;
            URLInfo = mods[1].URLInfo;
            detectorInstance = new OAuthDetector({ CLICK_TIMEOUT: 10, VISIT_TIMEOUT: 8 });
            detectorInstance.init();
          });
        });

        afterEach(function() {
          detectorInstance.unload();
        });

        it('returns true when there has been no activity and the URL contains "/oauth"', () => {
          const state = mockState(5, 'https://auth.ghostery.com/oauth', 'https://cliqz.com/');
          chai.expect(detectorInstance.checkIsOAuth(state)).to.be.true;
        });

        it('returns true when there has been no activity and the URL contains "/authorize"', () => {
          const state = mockState(5, 'https://auth.ghostery.com/authorize', 'https://cliqz.com/');
          chai.expect(detectorInstance.checkIsOAuth(state)).to.be.true;
        });

        it('returns true when there is only a click', (done) => {
          const tab = 5;
          const sourceUrl = 'https://cliqz.com/';
          events.pub('core:mouse-down', null, '', '', mockSender(tab, sourceUrl));
          const state = mockState(tab, 'https://auth.ghostery.com/oauth', sourceUrl);
          delayedTest(() => {
            chai.expect(detectorInstance.checkIsOAuth(state)).to.be.true;
          }, done, 5);
        });

        it('returns false with click and page', (done) => {
          const tab = 5;
          const sourceUrl = 'https://cliqz.com/';
          events.pub('core:mouse-down', null, '', '', mockSender(tab, sourceUrl));
          const fullPageState = mockState(tab + 1, 'https://auth.ghostery.com/', '', true);
          const state = mockState(tab, 'https://auth.ghostery.com/oauth', sourceUrl);
          setTimeout(() => detectorInstance.checkMainFrames(fullPageState), 2);
          delayedTest(() => {
            chai.expect(detectorInstance.checkIsOAuth(state)).to.be.false;
          }, done, 5);
        });

        it('returns true if page domain does not match', (done) => {
          const tab = 5;
          const sourceUrl = 'https://cliqz.com/';
          events.pub('core:mouse-down', null, '', '', mockSender(tab, sourceUrl));
          const fullPageState = mockState(tab + 1, 'https://www.ghostery.com/', '', true);
          const state = mockState(tab, 'https://auth.ghostery.com/oauth', sourceUrl);
          setTimeout(() => detectorInstance.checkMainFrames(fullPageState), 2);
          delayedTest(() => {
            chai.expect(detectorInstance.checkIsOAuth(state)).to.be.true;
          }, done, 5);
        });

        it('returns true if click domain does not match', (done) => {
          const tab = 5;
          const sourceUrl = 'https://cliqz.com/';
          const sourceUrl2 = 'https://www.cliqz.com/';
          events.pub('core:mouse-down', null, '', '', mockSender(tab, sourceUrl));
          const fullPageState = mockState(tab + 1, 'https://www.ghostery.com/', '', true);
          const state = mockState(tab, 'https://auth.ghostery.com/oauth', sourceUrl2);
          setTimeout(() => detectorInstance.checkMainFrames(fullPageState), 2);
          delayedTest(() => {
            chai.expect(detectorInstance.checkIsOAuth(state)).to.be.true;
          }, done, 5);
        });

      });

    });
  }
)
