/* global chai */
/* global describeModule */
/* global require */

const encoding = require('text-encoding');

const TextDecoder = encoding.TextDecoder;
const TextEncoder = encoding.TextEncoder;

const SAMPLE_URLS = [
  'http://www.google.com',
  'http://www.yahoo.com',
  'http://www.google2.com',
  'http://www.amazon.com',
  'http://www.chip.com',
  'http://www.facebook.com',
  'http://www.google.de',
  'http://www.test.com',
];


const randRange = (a,b) => Math.floor(Math.random() * (b-a)) + a;


function generateDomains(N = 20) {
  const ret = [];
  for (let i = 0; i < N; i += 1) {
    ret.push(`domain${String.fromCharCode(97+i)}.de`);
  }
  return ret;
}

function getWorldList(N = 10) {
  const ret = [];
  for (let i = 0; i < N; i += 1) {
    let word = '';
    for (let j = 0; j < 7; j += 1) {
      word += String.fromCharCode(randRange(97, 97+20))
    }
    ret.push(word);
  }
  return ret;
}

function generateQueriesFromKeywords(wordList, maxTotalWordsPerQuery = 7, N = 400) {
  const totWords = wordList.length;
  const getRandom = () => randRange(0, totWords);
  const unique = (l) => {
    const already = new Set();
    const result = [];
    l.forEach((w) => {
      if (!already.has(w)) {
        already.add(w);
        result.push(w);
      }
    })
    return result;
  };
  const ret = [];
  for (let i = 0; i < N; i += 1) {
    const wordsToUse = Math.min(getRandom() + 1, maxTotalWordsPerQuery);
    const currentQuery = [];
    for (let j = 0; j < wordsToUse; j += 1) {
      currentQuery.push(wordList[getRandom()])
    }
    ret.push(unique(currentQuery).join(' '));
  }
  return ret.filter(x => x !== '');
}

function buildOldFilters(domains, queries) {
  const result = [];
  domains.forEach((dom) => {
    queries.forEach((q) => {
      const sq = q.split(' ');
      let wp = '';
      sq.forEach(w => (wp += w + '^'));
      wp.slice(0, wp.length - 1);
      const pattern = `||${dom}^*${wp}`;
      result.push(pattern);
    });
  });
  return result;
}

function buildNewFilters(domains, queries) {
  const result = [];
  const domOpts = domains.join('|');
  queries.forEach(q => result.push(`${q}$fuzzy,domain=${domOpts}`));
  return result;
}

function buildUrlToTest(domains, queries, toMatchCount, notMatchCount) {
  const toMatchUrls = [];
  for (let i = 0; i < toMatchCount; i += 1) {
    const dom = domains[i % domains.length];
    const q = queries[i % queries.length];
    const resultUrl = `http://${dom}/${q.split(' ').join('+')}`;
    toMatchUrls.push(resultUrl);
  }
  const toNotMatchUrls = [];
  for (let i = 0; i < notMatchCount; i += 1) {
    const dom = domains[i % domains.length];
    const q = queries[i % queries.length];
    const resultUrl = `http://not${dom}extra/${q.split(' ').join('a_b')}`;
    toNotMatchUrls.push(resultUrl);
  }
  return { toMatchUrls, toNotMatchUrls };
}

export default describeModule('offers-v2/pattern-matching/pattern-matching-handler',
  () => ({
    'platform/text-decoder': {
      default: TextDecoder,
    },
    'platform/text-encoder': {
      default: TextEncoder,
    },
    'offers-v2/common/offers_v2_logger': {
      default: {
        debug: () => {},
        error: (...args) => {console.error(...args)},
        info: (...args) => {/* console.log(...args) */},
        log: () => {},
        warn: () => {},
        logObject: () => {},
      }
    },
    'core/platform': {
      isChromium: false
    },
    'core/cliqz': {
      default: {
        setInterval: function () {}
      },
      utils: {
        setInterval: function () {}
      }
    },
    'core/crypto/random': {
    },
    'platform/console': {
      default: {}
    },
    'platform/globals': {
      default: {}
    },
    'offers-v2/db_helper': {
      default: class {
        constructor(db) {
          this.db = {};
        }

        saveDocData(docID, docData) {
          const self = this;
          return new Promise((resolve, reject) => {
            self.db[docID] = JSON.parse(JSON.stringify(docData));
            resolve();
          });
        }

        getDocData(docID) {
          const self = this;
          return new Promise((resolve, reject) => {
            resolve(JSON.parse(JSON.stringify(self.db[docID])));
          });
        }

        removeDocData(docID) {
          const self = this;
          return new Promise((resolve, reject) => {
            if (self.db[docID]) {
              delete self.db[docID];
            }
            resolve(true);
          });
        }
      }
    },
    'offers-v2/features/history-feature': {
      default: class {
        constructor(d) {
          this.data = d;
          this.promises = [];
          this.callCount = 0;
        }
         // to be implemented by the inherited classes
        init() { return true; }
        unload() { return true; }
        isAvailable() { return true; }
        performQuery(q) {
          this.callCount += 1;
          const p = Promise.resolve(this.data);
          this.promises.push(p);
          return p;
        }
        clear() {
          this.data = null;
          this.promises = [];
          this.callCount = 0;
        }
      }
    },
    'offers-v2/features/feature-handler': {
      default: class {
        constructor(fmap) {
          this.fmap = fmap;
        }
        isFeatureAvailable(fn) { return this.fmap[fn]; }
        getFeature(fn) { return this.fmap[fn]; }
      }
    },
  }),
  () => {
    describe('#pattern-matching-handler', function() {
      let PatternMatchingHandler;
      let tokenizeUrl;
      let FeatureHandler;
      let HistoryFeatureMock;
      beforeEach(function () {
        PatternMatchingHandler = this.module().default;
        FeatureHandler = this.deps('offers-v2/features/feature-handler').default;
        HistoryFeatureMock = this.deps('offers-v2/features/history-feature').default;
        return Promise.all([
          this.system.import('offers-v2/pattern-matching/pattern-utils')
          ]).then((mod) => {
          tokenizeUrl = mod[0].default;
        });
      });

      function waitTillForMock(hfMock) {
        return Promise.all(hfMock.promises).then(() => true).catch(() => false);
      }

      function buildHistoryAnalyzerData({ m }) {
        return {
          d: {
            match_data: {
              total: {
                m,
              }
            }
          }
        };
      }

      context('basic tests', function () {
        let pmh;
        let hfMock;
        beforeEach(function () {
          hfMock = new HistoryFeatureMock();
          const fh = new FeatureHandler({'history': hfMock});
          pmh = new PatternMatchingHandler(fh);
        });

        it('/test PatternMatchingHandler and tokenizeUrl exists', function () {
          chai.expect(pmh).to.exist;
          chai.expect(tokenizeUrl).to.exist;
        });

        it('/test invalid url doesnt blow', function () {
          chai.expect(tokenizeUrl()).eql(null);
          chai.expect(tokenizeUrl(null)).eql(null);
          chai.expect(tokenizeUrl('')).eql(null);
        });

        it('/test invalid patterns doesnt blow', function () {
          const turl = tokenizeUrl('http://www.google.com');
          chai.expect(pmh.itMatches()).eql(false);
          chai.expect(pmh.itMatches(turl)).eql(false);
          chai.expect(pmh.itMatches(turl, {})).eql(false);
          chai.expect(pmh.itMatches(turl, { p_list: [] })).eql(false);
          chai.expect(pmh.itMatches(turl, { p_list: [] })).eql(false);
        });

        it('/test pattern current url doesnt match', function () {
          const urls = SAMPLE_URLS;
          const pobj = {
            pid: 'test',
            p_list: [
              '||gooogle.deee',
              '||yahooo.deee',
              '||xyz.deee',
            ],
          };
          urls.forEach((u) => {
            const turl = tokenizeUrl(u);
            chai.expect(turl).to.exist;
            chai.expect(pmh.itMatches(turl, pobj)).eql(false);
          });
        });

        it('/test pattern current url it match', function () {
          const urls = SAMPLE_URLS;
          const pobj = {
            pid: 'test',
            p_list: [
                '||google.com',
                '||yahoo.com',
                '||google2.com',
                '||amazon.com',
                '||chip.com',
                '||facebook.com',
                '||google.de',
                '||test.com',
            ],
          };
          urls.forEach((u) => {
            const turl = tokenizeUrl(u);
            chai.expect(turl).to.exist;
            chai.expect(pmh.itMatches(turl, pobj)).eql(true);
          });
        });

        it('/ensure patterns from trigger engine 6 still works', function () {
          const domains = generateDomains(20);
          const words = getWorldList(60);
          const queries = generateQueriesFromKeywords(words, 5, 20);
          const oldFilters = buildOldFilters(domains, queries);
          const pobj = {
            pid: 'test',
            p_list: oldFilters,
          };

          const EXPECTED_MATCHES = 100;
          const EXPECTED_NOT_MATCHES = 100;

          const { toMatchUrls, toNotMatchUrls } = buildUrlToTest(domains, queries, EXPECTED_MATCHES, EXPECTED_NOT_MATCHES);

          toMatchUrls.forEach((u) => {
            const turl = tokenizeUrl(u);
            chai.expect(turl).to.exist;
            chai.expect(pmh.itMatches(turl, pobj), `url: ${u}`).eql(true);
          });
          toNotMatchUrls.forEach((u) => {
            const turl = tokenizeUrl(u);
            chai.expect(turl).to.exist;
            chai.expect(pmh.itMatches(turl, pobj)).eql(false);
          });
        });

        it('/ensure patterns from trigger engine 7 still works', function () {
          const domains = generateDomains(20);
          const words = getWorldList(60);
          const queries = generateQueriesFromKeywords(words, 5, 20);
          const oldFilters = buildNewFilters(domains, queries);
          const pobj = {
            pid: 'test',
            p_list: oldFilters,
          };

          const EXPECTED_MATCHES = 100;
          const EXPECTED_NOT_MATCHES = 100;

          const { toMatchUrls, toNotMatchUrls } = buildUrlToTest(domains, queries, EXPECTED_MATCHES, EXPECTED_NOT_MATCHES);

          toMatchUrls.forEach((u) => {
            const turl = tokenizeUrl(u);
            chai.expect(turl).to.exist;
            chai.expect(pmh.itMatches(turl, pobj)).eql(true);
          });
          toNotMatchUrls.forEach((u) => {
            const turl = tokenizeUrl(u);
            chai.expect(turl).to.exist;
            chai.expect(pmh.itMatches(turl, pobj)).eql(false);
          });
        });


        // /////////////////////////////////////////////////////////////////////
        //        history match check
        // /////////////////////////////////////////////////////////////////////

        it('/test match invalid pattern', function () {
          chai.expect(pmh.countHistoryMatches(), 'first').eql(0);
          chai.expect(hfMock.callCount, '1 -').eql(0);
          chai.expect(pmh.countHistoryMatches({}, {}), 'second').eql(0);
          chai.expect(hfMock.callCount).eql(0);
          chai.expect(pmh.countHistoryMatches({since_secs: 1}, {}), 'third').eql(0);
          chai.expect(hfMock.callCount).eql(0);
          chai.expect(pmh.countHistoryMatches({since_secs: 1, till_secs: 2}, {})).eql(0);
          chai.expect(hfMock.callCount).eql(0);
          chai.expect(pmh.countHistoryMatches({since_secs: 1, till_secs: 0}, {})).eql(0);
          chai.expect(hfMock.callCount).eql(0);
          chai.expect(pmh.countHistoryMatches({since_secs: 1, till_secs: 0}, {pid: 'x'})).eql(0);
          chai.expect(hfMock.callCount).eql(0);
          chai.expect(pmh.countHistoryMatches({since_secs: 1, till_secs: 0}, {pid: 'x', p_list: []})).eql(0);
          chai.expect(hfMock.callCount).eql(0);
          chai.expect(pmh.countHistoryMatches({since_secs: 1, till_secs: 0}, {pid: 'x', p_list: ['||google.de']})).eql(0);
          chai.expect(hfMock.callCount).eql(1);
        });

        it('/test matches works', function () {
          const hamockData = buildHistoryAnalyzerData({ m: 1 });
          hfMock.data = hamockData;
          const q = {since_secs: 1, till_secs: 0};
          const pob = {pid: 'x', p_list: ['||google.de']};
          chai.expect(pmh.countHistoryMatches(q, pob)).eql(0);
          chai.expect(hfMock.callCount).eql(1);
          return waitTillForMock(hfMock).then((r) => {
            chai.expect(r).eql(true);
            // now the history should get the answer => update the internal data
            chai.expect(hfMock.callCount).eql(1);
            chai.expect(pmh.countHistoryMatches(q, pob)).eql(1);
          });
        });

        it('/test matches works when updating the query', function () {
          const hamockData = buildHistoryAnalyzerData({ m: 1 });
          hfMock.data = hamockData;
          const q = {since_secs: 1, till_secs: 0};
          const pob = {pid: 'x', p_list: ['||google.de']};
          chai.expect(pmh.countHistoryMatches(q, pob), 'first round').eql(0);
          chai.expect(hfMock.callCount).eql(1);
          return waitTillForMock(hfMock).then((r) => {
            chai.expect(r).eql(true);
            // still the same
            chai.expect(pmh.countHistoryMatches(q, pob)).eql(1);
            chai.expect(hfMock.callCount).eql(1);
            // changing the query should remove the cache
            q.since_secs = 10;
            const hamockData = buildHistoryAnalyzerData({ m: 6 });
            hfMock.data = hamockData;
            chai.expect(pmh.countHistoryMatches(q, pob), 'second round').eql(0);
            chai.expect(hfMock.callCount).eql(2);
            return waitTillForMock(hfMock).then((r) => {
              chai.expect(pmh.countHistoryMatches(q, pob)).eql(6);
              chai.expect(hfMock.callCount).eql(2);
            });
          });
        });


        it('/test multiple patterns', function () {
          for (let i = 0; i < 100; i += 1) {
            const hamockData = buildHistoryAnalyzerData({ m: i });
            hfMock.data = hamockData;
            const q = {since_secs: i + 100, till_secs: 0};
            const pob = {pid: `x-${i}`, p_list: ['||google.de']};
            chai.expect(pmh.countHistoryMatches(q, pob), 'first round').eql(0);
            chai.expect(hfMock.callCount, 'first callcount').eql(i + 1);
          }
          return waitTillForMock(hfMock).then((r) => {
            hfMock.callCount = 0;
            chai.expect(r).eql(true);
            for (let i = 0; i < 100; i += 1) {
              // check old
              const q = {since_secs: i + 100, till_secs: 0};
              const pob = {pid: `x-${i}`, p_list: ['||google.de']};
              chai.expect(pmh.countHistoryMatches(q, pob), 'second').eql(i);

              // call refresh the history return data
              const hamockData = buildHistoryAnalyzerData({ m: i + 1 });
              hfMock.data = hamockData;
              q.since_secs += 10;
              chai.expect(pmh.countHistoryMatches(q, pob), 'snd round').eql(0);
              chai.expect(hfMock.callCount, 'snd callcount').eql(i + 1);
            }
            return waitTillForMock(hfMock).then((r) => {
              chai.expect(r).eql(true);
              hfMock.callCount = 0;
              for (let i = 0; i < 100; i += 1) {
                const q = {since_secs: i + 100 + 10, till_secs: 0};
                const pob = {pid: `x-${i}`, p_list: ['||google.de']};
                chai.expect(pmh.countHistoryMatches(q, pob), 'third round').eql(i + 1);
                chai.expect(hfMock.callCount, 'third callcount').eql(0);
              }
            });
          });
        });

      });
    });
  }
);
