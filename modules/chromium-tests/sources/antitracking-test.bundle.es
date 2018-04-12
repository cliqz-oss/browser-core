/* eslint prefer-arrow-callback: 'off' */
/* eslint func-names: 'off' */
/* eslint no-unused-expressions: 'off' */
/* eslint no-param-reassign: 'off' */
/* eslint no-restricted-syntax: 'off' */
/* eslint no-console: 'off' */

/* global waitFor */
/* global testServer */
/* global chai */
/* global waitForAsync */

import { utils } from '../core/cliqz';
import * as browser from '../platform/browser';
import Attrack from '../antitracking/attrack';
import Config from '../antitracking/config';
import { HashProb } from '../antitracking/hash';
import { AttrackBloomFilter } from '../antitracking/bloom-filter';
import pacemaker from '../core/pacemaker';
import { URLInfo, parseURL } from '../core/url-info';
import { getGeneralDomain } from '../core/tlds';
import { trackerRuleParser, TrackerTXT, getDefaultTrackerTxtRule } from '../antitracking/tracker-txt';

// Mock webrequest listener
import { setGlobal } from '../core/kord/inject';
import WebRequestPipeline from '../webrequest-pipeline/background';


const hp = new HashProb();


// make sure that module is loaded (default it is not initialised on extension startup)
utils.setPref('modules.antitracking.enabled', true);

before((done) => {
  // pause pacemaker to prevent external list updates
  pacemaker.stop();
  const config = {
    mode: 'pac_script',
    pacScript: {
      data: `
        // Default connection
        let direct = "DIRECT";

        // Alternate Proxy Server
        let proxy = "PROXY localhost:3000";

        function FindProxyForURL(url, host)
        {
          // Use Proxy?
          if (localHostOrDomainIs(host, "cliqztest.com") || localHostOrDomainIs(host, "www.cliqztest.com")
            || localHostOrDomainIs(host, "cliqztest.de")) {
              return proxy;
          } else {
            return direct;
          }
        }
      `
    }
  };

  chrome.proxy.settings.set(
    { value: config, scope: 'regular' },
    done
  );
});

let attrack;

beforeEach(function () {
  // Try to mock app
  WebRequestPipeline.unload();
  return WebRequestPipeline.init({})
    .then(() => setGlobal({
      modules: {
        'webrequest-pipeline': {
          isEnabled: true,
          isReady() { return Promise.resolve(true); },
          background: {
            actions: {
              addPipelineStep(...args) {
                return WebRequestPipeline.actions.addPipelineStep(...args);
              },
              removePipelineStep(...args) {
                return WebRequestPipeline.actions.removePipelineStep(...args);
              },
            }
          }
        }
      }
    }))
    .then(() => {
      attrack = new Attrack();
    })
    .then(() => attrack.init(new Config({})));
});

after(() => {
  // restart pacemaker
  pacemaker.start();
});

afterEach(() =>
  attrack.tp_events.commit(true, true)
    .then(() => attrack.tp_events.push(true))
    .then(() => attrack.unload())
    .then(() => WebRequestPipeline.unload()));


describe('platform/browser', function () {
  describe('#checkIsWindowActive', function () {
    it('returns false for none existant tab ids', () =>
      browser.checkIsWindowActive(-1).then(res => chai.expect(res).to.be.false)
        .then(() => browser.checkIsWindowActive(0).then(res => chai.expect(res).to.be.false))
        .then(() => browser.checkIsWindowActive(532).then(res => chai.expect(res).to.be.false)));

    describe('when tab is opened', function () {
      let tabId;

      beforeEach(function () {
        attrack.tp_events._active = {};
        return testServer.registerPathHandler('/', '<html><body><p>Hello world</p></body></html')
          .then(() => browser.newTab(testServer.getBaseUrl(), true))
          .then((id) => { tabId = id; });
      });

      it('returns true for open tab id', function () {
        return browser.checkIsWindowActive(tabId)
          .then(res => chai.expect(res).to.be.true);
      });

      describe('when tab is closed', function () {
        it('returns false for closed tab id', () =>
          browser.closeTab(tabId)
            .then(() => browser.checkIsWindowActive(tabId))
            .then(res => chai.expect(res).to.be.false));
      });
    });
  });
});


describe('attrack.tp_events', function () {
  describe('Integration', function () {
    let tabs = [];

    beforeEach(function () {
      return attrack.tp_events.commit(true).then(() => {
        attrack.tp_events._staged = [];
        // prevent data push during the test
        attrack._last_push = (new Date()).getTime();
      });
    });

    afterEach(function () {
      return Promise.all(tabs.map(tabId => browser.closeTab(tabId)))
        .then(() => { tabs = []; });
    });

    it('should initially have no active tabs', function () {
      chai.expect(attrack.tp_events._active).to.be.empty;
    });

    describe('when tabs are opened', function () {
      let tabId = 0;
      tabs = [];
      let pageLoad;

      beforeEach(function () {
        return Promise.all([
          testServer.registerPathHandler('/', '<html><body><p>Hello world</p></body></html'),
          testServer.registerPathHandler('/privacy', '<html><body><p>Hello private world</p></body></html'),
        ])
          .then(() => browser.newTab(testServer.getBaseUrl(), false).then(id => tabs.push(id)))
          .then(() => browser.newTab(testServer.getBaseUrl('privacy#saferWeb'), false).then(id => tabs.push(id)));
      });

      it('should add tabs to _active', function () {
        return waitFor(function () {
          return Object.keys(attrack.tp_events._active).length === 2;
        })
          .then(function () {
            chai.expect(Object.keys(attrack.tp_events._active)).to.have.length(2);
            tabId = Object.keys(attrack.tp_events._active)[0];
            pageLoad = attrack.tp_events._active[tabId];
            chai.expect(pageLoad).to.include.keys('hostname', 'url', 'path');
            chai.expect(pageLoad.url).to.equal(testServer.getBaseUrl());
            chai.expect(pageLoad.hostname).to.equal('localhost');
            // md5('/')
            chai.expect(pageLoad.path).to.equal('6666cd76f96956469e7be39d750cc7d9'.substring(0, 16));
            chai.expect(pageLoad.tps).to.be.empty;
          });
      });

      describe('when a tab is closed', function () {
        beforeEach(function () {
          return waitFor(() => Object.keys(attrack.tp_events._active).length === 2)
            .then(() => browser.closeTab(tabs.shift()))
            .then(() => attrack.tp_events.commit(true));
        });

        xdescribe('attrack.tp_events.commit', function () {
          it('should stage closed tabs only', function () {
            chai.expect(Object.keys(attrack.tp_events._active)).to.have.length(1);
            // check staged tab
            if (attrack.tp_events._staged.length > 1) {
              throw attrack.tp_events._staged.map(s => s.url);
            }
            chai.expect(attrack.tp_events._staged).to.have.length(1);
            chai.expect(attrack.tp_events._staged[0].url).to.equal(testServer.getBaseUrl());

            // check active tab
            tabId = Object.keys(attrack.tp_events._active)[0];
            chai.expect(attrack.tp_events._active[tabId].url).to.equal(testServer.getBaseUrl('privacy#saferWeb'));
          });
        });
      });

      xdescribe('when new page is loaded in existing tab', function () {
        const newUrl = `http://cliqztest.de:${testServer.port}/`;
        beforeEach(function () {
          return browser.updateTab(tabs[0], newUrl);
        });

        describe('attrack.tp_events.commit', function () {
          it('should stage previous page load', function () {
            return waitForAsync(() =>
              attrack.tp_events.commit(true)
                .then(() => attrack.tp_events._staged.length > 0)
            )
              .then(function () {
                // still have 2 active tabs
                chai.expect(Object.keys(attrack.tp_events._active)).to.have.length(2);
                // check staged tab
                if (attrack.tp_events._staged.length > 1) {
                  const urls = attrack.tp_events._staged.map(function (s) { return s.url; });
                  throw urls;
                }
                chai.expect(attrack.tp_events._staged).to.have.length(1);
                chai.expect(attrack.tp_events._staged[0].url).to.equal(testServer.getBaseUrl());

                // check active tabs
                const tabUrls = Object.keys(attrack.tp_events._active).map(function (_tabId) {
                  return attrack.tp_events._active[_tabId].url;
                });
                chai.expect(tabUrls).to.not.contain(testServer.getBaseUrl());
                chai.expect(tabUrls).to.contain(testServer.getBaseUrl('privacy#saferWeb'));
              });
          });
        });
      });
    });

    describe('redirects', function () {
      // hit_target TODO

      beforeEach(function () {
        const body = '<html><body></body></html>';
        const jsBody = '<html><body><script>window.location="http://cliqztest.com/target"</script></body></html>';
        // 302 redirect case
        return Promise.all([
          testServer.registerPathHandler('/302', body, [{ name: 'Location', value: 'http://cliqztest.com/target' }], '302'),
          testServer.registerPathHandler('/303', body, [{ name: 'Location', value: 'http://cliqztest.com/target' }], '303'),
          testServer.registerPathHandler('/js', jsBody),
          testServer.registerPathHandler('/target', body),
        ]);
      });

      ['302', '303', 'js'].forEach(function (kind) {
        describe(kind, function () {
          beforeEach(function () {
            return browser.newTab(testServer.getBaseUrl(kind))
              .then(id => tabs.push(id));
          });

          it('gets host at end of redirect chain', function () {
            return waitForAsync(() => testServer.hasHit('/target'))
              .then(() => attrack.tp_events.commit(true))
              .then(() => testServer.getHits())
              .then((hits) => {
                chai.expect(hits[`/${kind}`]).to.have.length(1);
                chai.expect(Object.keys(attrack.tp_events._active)).to.have.length(1);
                const tabid = Object.keys(attrack.tp_events._active)[0];
                chai.expect(attrack.tp_events._active[tabid].hostname).to.equal('cliqztest.com');
                if (kind !== 'js') {
                  // check original is in redirect chain
                  chai.expect(attrack.tp_events._active[tabid].redirects).to.have.length(1);
                  chai.expect(attrack.tp_events._active[tabid].redirects[0]).to.equal('localhost');
                }
              });
          });
        });
      });
    });
  });

  describe('onFullPage', function () {
    const urlParts = URLInfo.get('https://cliqz.com');
    const mockTabId = 43;

    beforeEach(function () {
      return attrack.tp_events.commit(true).then(() => {
        attrack.tp_events._staged = [];
        // prevent data push during the test
        attrack._last_push = (new Date()).getTime();
      });
    });

    it("adds a tab to _active with request context's tab ID", function () {
      const pageLoad = attrack.tp_events.onFullPage(urlParts, mockTabId);

      chai.expect(pageLoad).is.not.null;
      chai.expect(Object.keys(attrack.tp_events._active)).to.have.length(1);
      chai.expect(attrack.tp_events._active).to.have.property(mockTabId);
      chai.expect(attrack.tp_events._active[mockTabId].url).to.equal(urlParts.toString());
    });

    it('does not add a tab to _active if the url is malformed', function () {
      [null, undefined, 'http://cliqz.com', URLInfo.get('/home/cliqz'), URLInfo.get('about:config')].forEach(function (url) {
        const pageLoad = attrack.tp_events.onFullPage(url, mockTabId);

        chai.expect(pageLoad).is.null;
        chai.expect(Object.keys(attrack.tp_events._active)).to.have.length(0);
      });
    });

    it('does not add a tab to _active if the tab ID <= 0', function () {
      [null, undefined, 0, -1].forEach(function (id) {
        const pageLoad = attrack.tp_events.onFullPage(urlParts, id);

        chai.expect(pageLoad).is.null;
        chai.expect(Object.keys(attrack.tp_events._active)).to.have.length(0);
      });
    });
  });

  describe('get', function () {
    const srcUrl = 'https://cliqz.com';
    const srcUrlParts = URLInfo.get(srcUrl);
    const url = 'https://example.com/beacon';
    const urlParts = URLInfo.get(url);
    const mockTabId = 34;

    const testInvalidTabIds = function () {
      [undefined, null, 0, -1, 552].forEach(function (tabId) {
        const req = attrack.tp_events.get(url, urlParts, srcUrl, srcUrlParts, tabId);
        chai.expect(req).to.be.null;
      });
    };

    beforeEach(function () {
      return attrack.tp_events.commit(true).then(() => {
        attrack.tp_events._staged = [];
        // prevent data push during the test
        attrack._last_push = (new Date()).getTime();
      });
    });

    describe('after page load', function () {
      let pageLoad;

      beforeEach(function () {
        pageLoad = attrack.tp_events.onFullPage(srcUrlParts, mockTabId);
      });

      it('returns a stats object for the specified page load and third party', function () {
        const req = attrack.tp_events.get(url, urlParts, srcUrl, srcUrlParts, mockTabId);

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

        const req = attrack.tp_events.get(url, urlParts, altUrl, altUrlParts, mockTabId);

        chai.expect(req).to.be.null;
      });

      it('third party referrer relation is transative', function () {
        const altUrl = 'https://www.w3.org/';
        const altUrlParts = URLInfo.get(altUrl);

        attrack.tp_events.get(url, urlParts, srcUrl, srcUrlParts, mockTabId);
        const req = attrack.tp_events.get(altUrl, altUrlParts, url, urlParts, mockTabId);

        chai.expect(req).to.not.be.null;
        chai.expect(req.c).to.equal(0);
        chai.expect(pageLoad.tps).to.have.property(urlParts.hostname);
        chai.expect(pageLoad.tps).to.have.property(altUrlParts.hostname);
        chai.expect(pageLoad.tps[altUrlParts.hostname]).to.have.property(altUrlParts.path);
        chai.expect(pageLoad.tps[altUrlParts.hostname][altUrlParts.path]).to.equal(req);
      });
    });

    it('returns null if onFullPage has not been called for the referrer', function () {
      const req = attrack.tp_events.get(url, urlParts, srcUrl, srcUrlParts, mockTabId);

      chai.expect(req).to.be.null;
      chai.expect(attrack.tp_events._active).to.be.empty;
    });

    it('returns null if source tab is invalid', testInvalidTabIds);
  });

  describe('PageLoadData', function () {
    let pageLoad;
    const url = 'https://cliqz.com/privacy#saferWeb';
    const urlParts = URLInfo.get(url);

    beforeEach(function () {
      pageLoad = attrack.tp_events.onFullPage(urlParts, 1);
    });

    it('should have initial attributes from source url', function () {
      console.log(pageLoad);
      chai.expect(pageLoad.url).to.equal(url);
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
        chai.expect(plain.hostname).to.equal('716378bd1d4c36198e252476ef80c66e'.substring(0, 16));
      });

      it('should sum third party stats', function () {
        const paths = ['script.js', 'beacon'];
        const tps = paths.map(function (p) {
          return pageLoad.getTpUrl('example.com', p);
        });
        tps.forEach(function (tp) {
          tp.c += 1;
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
        tps.forEach(function (tp) {
          tp.c += 1;
        });
        tps[1].has_qs = 1;

        const plain = pageLoad.asPlainObject();
        chai.expect(plain.tps['example.com']).to.eql({ c: 2, has_qs: 1 });
      });
    });
  });
});

describe('attrack.isHash', function () {
  // we test between 7 to 12 characters
  const notHash = ['',
    'Firefox',
    'cliqz.com', // a url
    'anti-tracking',
    'front/ng',
    'javascript',
    'callback'
  ];

  const hashes = ['04C2EAD03B',
    '54f5095c96e',
    'B62a15974a93',
    '22163a4ff903',
    '468x742',
    '1021x952',
    '1024x768',
    '1440x900'
  ];

  before(function () {
    return hp.init();
  });

  notHash.forEach(function (str) {
    it(`'${str}' is not a hash`, function () {
      chai.expect(hp.isHash(str)).to.be.false;
    });
  });

  hashes.forEach(function (str) {
    it(`'${str}' is a hash`, function () {
      chai.expect(hp.isHash(str)).to.be.true;
    });
  });
});

describe('attrack.getGeneralDomain', function () {
  const spec = {
    'cliqz.com': ['cliqz.com', 'www.cliqz.com', 'a.b.cliqz.com'],
    'example.co.uk': ['example.co.uk', 'test.example.co.uk'],
    '127.0.0.1': ['127.0.0.1'],
    '1.2.3.4': ['1.2.3.4']
  };

  for (const generalDomain in spec) {
    if (Object.prototype.hasOwnProperty.call(spec, generalDomain)) {
      spec[generalDomain].forEach(function (subDomain) {
        const gen = generalDomain;
        it(`${subDomain} has general domain ${gen}`, function () {
          chai.expect(getGeneralDomain(subDomain)).to.eql(gen);
        });
      });
    }
  }
});

describe('attrack list update', function () {
  const mockBloomFilterMajor = '{"bkt": [1, 2, 3, 4, 5], "k": 5}';
  const mockBloomFilterMinor = '{"bkt": [1, 0, 0, 0, 0], "k": 5}';
  const mockBloomFilterConfig = day => `{"major": "${day}", "minor": "1"}`;
  const day = (new Date()).toISOString().substring(0, 10);
  let mockBloomFilterConfigUrl = null;
  let mockBloomFilterBaseUrl = null;

  beforeEach(function () {
    // serve fake whitelists
    mockBloomFilterConfigUrl = testServer.getBaseUrl('bloom_filter/config');
    mockBloomFilterBaseUrl = testServer.getBaseUrl('bloom_filter/');
    return Promise.all([
      testServer.registerPathHandler(`/bloom_filter/${day}/0.gz`, mockBloomFilterMajor),
      testServer.registerPathHandler(`/bloom_filter/${day}/1.gz`, mockBloomFilterMinor),
      testServer.registerPathHandler('/bloom_filter/config', mockBloomFilterConfig(day)),
    ]);
  });

  describe('loadBloomFilter', function () {
    let bloomFilter;

    beforeEach(function () {
      bloomFilter = new AttrackBloomFilter(null, mockBloomFilterConfigUrl, mockBloomFilterBaseUrl);
    });

    it('bloom filter init', function () {
      bloomFilter.update();
      return waitFor(function () {
        return bloomFilter.bloomFilter != null && bloomFilter.version != null;
      }).then(function () {
        chai.expect(bloomFilter.version.major).to.equal(day);
        chai.expect(bloomFilter.bloomFilter.k).to.equal(5);
      });
    });

    it('bloom filter update', function () {
      return bloomFilter.update()
        .then(() => {
          chai.expect(bloomFilter.version.major).to.equal(day);
          chai.expect(bloomFilter.bloomFilter.k).to.equal(5);
        });
    });
  });
});

describe('isSourceWhitelisted', function () {
  it('returns false for non whitelisted domain', function () {
    chai.expect(attrack.urlWhitelist.isWhitelisted('example.com')).to.be.false;
  });

  describe('add domain to url whitelist', function () {
    afterEach(function () {
      attrack.urlWhitelist.changeState('example.com', 'hostname', 'remove');
    });

    it('adds a source domain to the whitelist', function () {
      attrack.urlWhitelist.changeState('example.com', 'hostname', 'add');
      chai.expect(attrack.urlWhitelist.isWhitelisted('example.com')).to.be.true;
    });

    it('does not add any other domains to the whitelist', function () {
      attrack.urlWhitelist.changeState('example.com', 'hostname', 'add');
      chai.expect(attrack.urlWhitelist.isWhitelisted('another.example.com')).to.be.false;
    });
  });

  describe('remove domain from url whitelist', function () {
    afterEach(function () {
      attrack.urlWhitelist.changeState('example.com', 'hostname', 'remove');
      attrack.urlWhitelist.changeState('another.example.com', 'hostname', 'remove');
    });

    it('removes a domain from the whitelist', function () {
      attrack.urlWhitelist.changeState('example.com', 'hostname', 'add');
      attrack.urlWhitelist.changeState('example.com', 'hostname', 'remove');
      chai.expect(attrack.urlWhitelist.isWhitelisted('example.com')).to.be.false;
    });

    it('does not remove other domains', function () {
      attrack.urlWhitelist.changeState('example.com', 'hostname', 'add');
      attrack.urlWhitelist.changeState('another.example.com', 'hostname', 'add');
      attrack.urlWhitelist.changeState('example.com', 'hostname', 'remove');

      chai.expect(attrack.urlWhitelist.isWhitelisted('example.com')).to.be.false;
      chai.expect(attrack.urlWhitelist.isWhitelisted('another.example.com')).to.be.true;
    });
  });
});

describe('Tracking.txt', function () {
  it('parse rules correctly', function () {
    const txt = 'R site1.com empty\nR   site2.com\tplaceholder\nnot a rule';
    const rules = [];
    trackerRuleParser(txt, rules);
    chai.expect(rules).to.deep.equal([{ site: 'site1.com', rule: 'empty' }, { site: 'site2.com', rule: 'placeholder' }]);
  });

  it('ignore comments', function () {
    const txt = '# comment\n! pass\nR site1.com empty\nR site2.com placeholder\nnot a rule';
    const rules = [];
    trackerRuleParser(txt, rules);
    chai.expect(rules).to.deep.equal([{ site: 'site1.com', rule: 'empty' }, { site: 'site2.com', rule: 'placeholder' }]);
  });

  it('apply correct rule to 3rd party', function () {
    const txt = '# comment\n! pass\nR aaa.site1.com empty\nR site1.com placeholder\nnot a rule';
    const r = TrackerTXT.get(parseURL('http://www.google.com/'));
    trackerRuleParser(txt, r.rules);
    r.status = 'update';
    chai.expect(r.getRule('bbbaaa.site1.com')).to.equal('empty');
    chai.expect(r.getRule('aa.site1.com')).to.equal('placeholder');
    chai.expect(r.getRule('aa.site2.com')).to.equal(getDefaultTrackerTxtRule());
  });
});
