'use strict';

var expect = chai.expect;

TESTS.Mixer = function(Mixer, CliqzUtils) {
  describe('Mixer', function() {

    beforeEach(function() {
      // Disable cleaning of smartCLIQZ trigger URLs during testing
      Mixer._cleanTriggerUrls = function() {};
    });

    describe('prepareExtraResults', function() {
      it('should discard bad EZs', function() {
        var input = [
          {
            data: { garbage: 'useless' },
          },
        ];
        Mixer._prepareExtraResults(input);
        expect(Mixer._prepareExtraResults(input)).to.be.empty;
      });

      it('should add trigger_method to each result', function() {
        var input = [
          {
            style: 'cliqz-extra',
            val: 'https://cliqz.com/',
            comment: 'Cliqz',
            label: 'https://cliqz.com/',
            query: 'cliqz.c',
            data: {
              answer: '15:16',
              expression: 'Mittwoch - 30 September 2015',
              ez_type: 'time',
              friendly_url: 'worldtime.io/current/WzUxLCA5XXw5fDUx',
              is_calculus: true,
              line3: 'Central European Summer Time (UTC/GMT +2:00)',
              location: 'Deutschland',
              mapped_location: 'DE',
              meta: {
                lazyRH_: '0.00108695030212'
              },
              prefix_answer: '',
              support_copy_ans: null,
              template: 'calculator',
              subType: '{"ez": "-6262111850032132334"}',
              ts: 1443619006,
              kind: ['X|{"ez": "-6262111850032132334"}'],
            },
          },
        ];

        var expected = 'X|{"ez":"-6262111850032132334","trigger_method":"rh_query"}';

        var results = Mixer._prepareExtraResults(input);

        results.forEach(function(result) {
          expect(result).to.contain.all.keys(input[0]);
          expect(result.data.kind[0]).to.equal(expected);
        });
      });
    });

    describe('prepareCliqzResults', function() {

      it('should add i to each subtype', function() {
        var input = [
          {
            q: 'cinema',
            url: 'http://www.cinema.de/',
            source: 'bm',
            snippet: {
              desc: 'Das Kinoprogramm in Deutschland mit allen Neustarts, Filmen, DVDs, dem Filmquiz und vielen Stars, News, Fotos und Insider-Infos: alles rund ums Kino bei CINEMA Online.',
              title: 'Kino bei CINEMA: Kinoprogramm, Filme, DVDs, Stars, Trailer und mehr - Cinema.de',
            },
          },
          {
            q: 'cinema',
            url: 'http://www.cinemaxx.de/',
            source: 'bm',
            snippet: {
              desc: 'Aktuelles Kinoprogramm und Filmstarts. Kinotickets gleich online kaufen oder reservieren. Kino in bester Qualität - Willkommen bei CinemaxX',
              title: 'Kino in bester Qualität - Herzlich willkommen in Ihrem CinemaxX.',
            },
          },
          {
            q: 'cinema',
            url: 'http://www.cinema-muenchen.de/',
            source: 'bm',
            snippet: {
              desc: 'Startseite',
              title: 'Willkommen bei Cinema München - Cinema München',
            },
          },
        ];

        var results = Mixer._prepareCliqzResults(input);

        results.forEach(function(result, i) {
          var parts = result.data.kind[0].split('|'),
              params = JSON.parse(parts[1] || '{}');
          expect(params).to.contain.key('i');
          expect(params.i).to.equal(i);
        });
      });
    });

    describe('isValidQueryForEZ', function() {

      var subject = Mixer._isValidQueryForEZ,
                    blacklist;

      beforeEach(function() {
        blacklist = Mixer.EZ_QUERY_BLACKLIST;
        Mixer.EZ_QUERY_BLACKLIST = ['xxx', 'yyy', 'ggg'];
      });

      afterEach(function() {
        Mixer.EZ_QUERY_BLACKLIST = blacklist;
      });

      it('rejects queries in blacklist', function() {
        Mixer.EZ_QUERY_BLACKLIST.forEach(function(query) {
          expect(subject(query)).to.be.false;
        });
      });

      it('ignores capitalization', function() {
        Mixer.EZ_QUERY_BLACKLIST.map(function(q) {return q.toUpperCase();})
                                 .forEach(function(query) {
          expect(subject(query)).to.be.false;
        });

        expect(subject('A')).to.be.false;
        expect(subject('AA')).to.be.false;
      });

      it('ignores whitespace', function() {
        Mixer.EZ_QUERY_BLACKLIST.map(function(q) {return ' ' + q + ' ';})
                                .forEach(function(query) {
          expect(subject(query)).to.be.false;
        });

        expect(subject(' ')).to.be.false;
        expect(subject('a ')).to.be.false;
        expect(subject(' aa ')).to.be.false;
      });

      it('rejects short queries', function() {
        expect(subject('')).to.be.false;
        expect(subject('a')).to.be.false;
        expect(subject('aa')).to.be.false;
      });

      it('accepts queries not in blacklist longer than 2 chars', function() {
        expect(subject('wwww')).to.be.true;
        expect(subject('http://www.fac')).to.be.true;
        expect(subject('wmag')).to.be.true;
        expect(subject(' www.f')).to.be.true;
      });

    });

    describe('addEZfromBM', function() {
      var result = {
        url: 'http://www.bild.de/',
        snippet: {
          title: 'Bild',
          desc: 'Bild News',
        },
        extra: {
          data: {
            domain: 'bild.de',
            friendly_url: 'bild.de',
            name: 'Bild',
            template: 'entity-news-1',
          },
          url: 'http://www.bild.de',
          subType: '{"ez": "4573617661040092857"}',
          trigger_urls: [
            'bild.de',
          ],
        },
      };

      it('should add EZ to empty list', function() {
        var extra = [];

        Mixer._addEZfromBM(extra, result);

        expect(extra).to.have.length(1);
        expect(extra[0].data.subType).to.equal(result.extra.subType);
        expect(extra[0].comment).to.equal(result.snippet.title);
      });

      it('should add EZ to end of existing list', function() {
        var extra = [{test: 'abc'}];

        Mixer._addEZfromBM(extra, result);

        expect(extra).to.have.length(2);
        expect(extra[extra.length - 1].data.subType).to.equal(result.extra.subType);
        expect(extra[extra.length - 1].comment).to.equal(result.snippet.title);
      });

    });

    describe('collectSublinks', function() {
      it('should find nothing', function() {
        var data = {
          dsf: 'Asfd',
          afds: {
            sdfa: {
              fds: 'fdsa',
            },
          },
        };
        var sublinks = Mixer._collectSublinks(data);

        expect(sublinks).to.be.empty;
      });

      it('should find with key url', function() {
        var data = {
          dsf: 'Asfd',
          afds: {
            adfs: ['ff', 'ff'],
            sdfa: {
              url: 'http://www.test.com',
            },
          },
        };
        var sublinks = Mixer._collectSublinks(data);

        expect(sublinks).to.contain('http://www.test.com');
      });

      it('should find with key href', function() {
        var data = {
          dsf: 'Asfd',
          afds: {
            adfs: ['ff', 'ff'],
            sdfa: {
              href: 'http://www.test.com',
            },
          },
        };
        var sublinks = Mixer._collectSublinks(data);

        expect(sublinks).to.contain('http://www.test.com');
      });

      it('should find three', function() {
        var data = {
          dsf: 'Asfd',
          url: 'http://bbb.com',
          afds: {
            adfs: ['ff', 'ff'],
            sdfa: [
              {
                href: 'http://www.test.com',
              },
              {
                href: 'http://aaa.com',
              },
            ],
          },
        };
        var sublinks = Mixer._collectSublinks(data);

        expect(sublinks).to.contain('http://www.test.com');
        expect(sublinks).to.contain('http://aaa.com');
        expect(sublinks).to.contain('http://bbb.com');
      });

    });

    describe('getDuplicates', function() {
      var results, cliqz;
      beforeEach(function() {
        results = [
          {
            style: 'favicon',
            val: 'https://www.facebook.com/',
            comment: 'Facebook (history generic)!',
            label: 'https://www.facebook.com/',
            query: 'f',
            data: {
              kind: ['H'],
              description: 'Facebook is a social utility.',
            },
          },
          {
            style: 'favicon',
            val: 'http://www.fasd-hh.rosenke.de/',
            comment: 'FASD-Hamburg - Startseite (history generic)!',
            label: 'http://www.fasd-hh.rosenke.de/',
            query: 'f',
            data: {
              kind: ['H'],
              description: 'FASD-Hamburg',
            },
          },
        ];

        cliqz = [
          {
            style: 'cliqz-results sources-m',
            val: 'https://mail.facebook.com/',
            comment: 'Facebook',
            label: 'https://mail.facebook.com/',
            query: 'bm f undefined',
            data: {
              description: 'Facebook ist ein soziales.',
              title: 'Facebook',
              kind: ['m|{"i":0}'],
            },
          },
          {
            style: 'cliqz-results sources-m',
            val: 'https://fxyz.com/',
            comment: 'FXYZ',
            label: 'https://fxyz.com/',
            query: 'bm f undefined',
            data: {
              description: 'FXYZ is cool',
              title: 'FXYZ',
              kind: ['m|{"i":1}'],
            },
          },
        ];
      });

      it('should find no duplicates', function() {
        var duplicates = Mixer._getDuplicates(results, cliqz);
        expect(duplicates).to.be.empty;
      });

      it('should find one duplicate - main link', function() {
        cliqz[0].label = cliqz[0].val = results[0].label;
        var duplicates = Mixer._getDuplicates(results, cliqz);
        expect(duplicates).to.have.length(1);
        expect(duplicates[0]).to.be.deep.equal(cliqz[0]);
      });

      it('should find one duplicate - sub link', function() {
        results[0].style = 'cliqz-pattern';
        results[0].data.urls = [{href: 'https://mail.facebook.com/'}];
        var duplicates = Mixer._getDuplicates(results, cliqz);
        expect(duplicates).to.have.length(1);
        expect(duplicates[0]).to.be.deep.equal(cliqz[0]);
      });

      it('should find one duplicate - main link different country', function() {
        cliqz[0].label = cliqz[0].val = 'https://de-de.facebook.com/';
        var duplicates = Mixer._getDuplicates(results, cliqz);
        expect(duplicates).to.have.length(1);
        expect(duplicates[0]).to.be.deep.equal(cliqz[0]);
      });
    });

    describe('deduplicateResults', function() {
      var results, cliqz;
      beforeEach(function() {
        results = [
          {
            style: 'favicon',
            val: 'https://www.facebook.com/',
            comment: 'Facebook (history generic)!',
            label: 'https://www.facebook.com/',
            query: 'f',
            data: {
              kind: ['H'],
              description: 'Facebook is a social utility.',
            },
          },
          {
            style: 'favicon',
            val: 'http://www.fasd-hh.rosenke.de/',
            comment: 'FASD-Hamburg - Startseite (history generic)!',
            label: 'http://www.fasd-hh.rosenke.de/',
            query: 'f',
            data: {
              kind: ['H'],
              description: 'FASD-Hamburg',
            },
          },
        ];

        cliqz = [
          {
            style: 'cliqz-results sources-m',
            val: 'https://mail.facebook.com/',
            comment: 'Facebook',
            label: 'https://mail.facebook.com/',
            query: 'bm f undefined',
            data: {
              description: 'Facebook ist ein soziales.',
              title: 'Facebook',
              kind: ['m|{"i":0}'],
            },
          },
          {
            style: 'cliqz-results sources-m',
            val: 'https://fxyz.com/',
            comment: 'FXYZ',
            label: 'https://fxyz.com/',
            query: 'bm f undefined',
            data: {
              description: 'FXYZ is cool',
              title: 'FXYZ',
              kind: ['m|{"i":1}'],
            },
          },
        ];
      });

      it('should leave both lists alone', function() {
        var r = Mixer._deduplicateResults(results, cliqz);

        expect(r.first).to.have.length(2);
        expect(r.second).to.have.length(2);
      });

      it('should remove facebook from cliqz', function() {
        cliqz[0].label = cliqz[0].val = results[0].label;

        var r = Mixer._deduplicateResults(results, cliqz);

        expect(r.first).to.have.length(2);
        expect(r.second).to.have.length(1);

        // Check kinds are combined properly
        expect(r.first[0].data.kind).to.contain(cliqz[0].data.kind[0]);
      });

      it('should remove facebook from cliqz because of matching sublink', function() {
        results[0].style = 'cliqz-pattern';
        results[0].data.urls = [{href: 'https://mail.facebook.com/'}];

        var r = Mixer._deduplicateResults(results, cliqz);

        expect(r.first).to.have.length(2);
        expect(r.second).to.have.length(1);
      });

      it('should remove facebook from cliqz because only different by country', function() {
        cliqz[0].label = cliqz[0].val = 'https://de-de.facebook.com/';

        var r = Mixer._deduplicateResults(results, cliqz);

        expect(r.first).to.have.length(2);
        expect(r.second).to.have.length(1);

        // Check kinds are combined properly
        expect(r.first[0].data.kind).to.contain(cliqz[0].data.kind[0]);
      });
    });

    describe('isValidEZ', function() {
      var result;

      beforeEach(function() {
        result = {
          style: 'cliqz-extra',
          val: 'https://cliqz.com/',
          comment: 'Cliqz',
          label: 'https://cliqz.com/',
          query: 'cliqz.c',
          data: {
            friendly_url: 'cliqz.com',
            template: 'Cliqz',
            subType: '{"class": "CliqzEZ", "ez": "deprecated"}',
            trigger_urls: ['cliqz.com'],
            ts: 1447772162,
            kind: ['X|{"ez":"-7290289273393613729","trigger_method":"rh_query"}'],
            __subType__: {
              class: "CliqzEZ",
              id: "2700150093133398460",
              name: "Cliqz 1",
            },
          },
        };
      });

      it('should accept good ez', function() {
        expect(Mixer._isValidEZ(result)).to.be.true;
      });

      it('should discard if url is missing', function() {
        delete result.val;
        expect(Mixer._isValidEZ(result)).to.be.false;
      });

      it('should discard if data is missing', function() {
        delete result.data;
        expect(Mixer._isValidEZ(result)).to.be.false;
      });

      it('should discard if subType is missing or unparsable', function() {
        result.data.subType = 'afsdfdasfdsfds{';
        expect(Mixer._isValidEZ(result)).to.be.false;
        delete result.subType;
        expect(Mixer._isValidEZ(result)).to.be.false;
      });

      it('should discard if __subType__ is missing or ID is missing', function() {
        delete result.data.__subType__.id;
        expect(Mixer._isValidEZ(result)).to.be.false;
        delete result.data.__subType__;
        expect(Mixer._isValidEZ(result)).to.be.false;
      });
    });

    describe('cacheEZs', function() {

      // extracts id from SmartCliqz
      function getIdfunction(smartCliqz) {
        return smartCliqz.data.__subType__.id;
      }

      function getUrlfunction(smartCliqz) {
        return CliqzUtils.generalizeUrl(smartCliqz.val, true);
      }

      var saved = false,
          results = {},
          urls = {},
          ezs = {},
          smartCliqzCache = CliqzUtils.System.get('smart-cliqz-cache/background').default.smartCliqzCache,
          triggerUrlCache = CliqzUtils.System.get('smart-cliqz-cache/background').default.triggerUrlCache,
          triggerUrlCacheRetrieve = triggerUrlCache.retrieve,
          triggerUrlCacheStore = triggerUrlCache.store,
          triggerUrlCacheSave = triggerUrlCache.save,
          ezStore = smartCliqzCache.store;

      // Mock CliqzSmartCliqzCache
      beforeEach(function() {
        results = [
        {
          style: 'cliqz-extra',
          val: 'https://cliqz.com/',
          comment: 'Cliqz',
          label: 'https://cliqz.com/',
          query: 'cliqz.c',
          data: {
            friendly_url: 'cliqz.com',
            template: 'Cliqz',
            subType: '{"class": "CliqzEZ", "ez": "deprecated"}',
            trigger_urls: ['cliqz.com'],
            ts: 1447772162,
            kind: ['X|{"ez":"-7290289273393613729","trigger_method":"rh_query"}'],
            __subType__: {
              class: "CliqzEZ",
              id: "2700150093133398460",
              name: "Cliqz 1",
            },
          },
        },];

        saved = false;
        urls = {};
        ezs = {};

        triggerUrlCache.retrieve = function (url) {
          if (!(url in urls)) {
            return urls[url];
          } else {
            return false;
          }
        };
        triggerUrlCache.store = function (url, eztype) {
          urls[url] = eztype;
          saved = false;
        };
        triggerUrlCache.save = function () {
          saved = true;
        };

        smartCliqzCache.store = function(ezData) {
          ezs[getUrlfunction(ezData)] = ezData;
        };
      });

      afterEach(function() {
        var smartCliqzCache = CliqzUtils.System.get('smart-cliqz-cache/background').default.smartCliqzCache;
        smartCliqzCache.store = ezStore;

        triggerUrlCache.retrieve = triggerUrlCacheRetrieve;
        triggerUrlCache.store = triggerUrlCacheStore;
        triggerUrlCache.save = triggerUrlCacheSave;
      });

      it('should cache 1 entry given 1', function() {
        Mixer._cacheEZs([results[0]]);

        expect(saved).to.be.true;
        expect(Object.keys(urls)).length.to.be(1);
        expect(urls[results[0].data.trigger_urls[0]]).to.be.true;
        expect(ezs[getUrlfunction(results[0])]).to.equal(results[0]);
      });

      it('should cache 1 entry given 2 with same URL', function() {
        results.push(JSON.parse(JSON.stringify(results[0])));
        results[1].comment = 'Second entry';
        Mixer._cacheEZs(results);

        expect(saved).to.be.true;
        expect(Object.keys(urls)).length.to.be(1);
        expect(urls[results[0].data.trigger_urls[0]]).to.be.true;

        // require first entry to have priority over the second
        expect(ezs[getUrlfunction(results[0])]).to.equal(results[0]);
      });

      it('should cache 2 entries given 2', function() {
        results.push(JSON.parse(JSON.stringify(results[0])));
        results[1].val = 'http://test.com';
        results[1].data.trigger_urls[0] = 'test.com';
        results[1].data.__subType__ = { id: "1111111111" };

        Mixer._cacheEZs(results);

        expect(saved).to.be.true;
        expect(Object.keys(urls)).length.to.be(2);
        results.forEach(function(result) {
          expect(urls[result.data.trigger_urls[0]]).to.be.true;
          // expect(ezs[getUrlfunction(result)]).to.equal(result);
        });
      });
    });

    describe('historyTriggerEZ', function() {
      var fetching,
          result = {},
          urls = {},
          ezs = {},
          smartCliqzCache = CliqzUtils.System.get('smart-cliqz-cache/background').default.smartCliqzCache,
          triggerUrlCache = CliqzUtils.System.get('smart-cliqz-cache/background').default.triggerUrlCache,
          triggerUrlCacheIsCached = triggerUrlCache.isCached,
          triggerUrlCacheRetrieve = triggerUrlCache.retrieve,
          triggerUrlCacheIsStale = triggerUrlCache.isStale,
          ezFetchStore = smartCliqzCache.fetchAndStore,
          ezRetrieve = smartCliqzCache.retrieve;

      // Mock CliqzSmartCliqzCache
      beforeEach(function() {
        result = {
          style: 'cliqz-pattern',
          val: 'https://cliqz.com/',
          comment: 'Cliqz',
          label: 'https://cliqz.com/',
          query: 'cliqz.c',
          data: {
            cluster: true,
            urls: [],
          },
        };

        ezs = {
          '-7290289273393613729': {
            style: 'cliqz-extra',
            val: 'https://cliqz.com/',
            comment: 'Cliqz',
            label: 'https://cliqz.com/',
            query: 'cliqz.c',
            data: {
              friendly_url: 'cliqz.com',
              template: 'Cliqz',
              subType: '{"class": "CliqzEZ", "ez": "deprecated"}',
              trigger_urls: ['cliqz.com'],
              ts: 1447772162,
              kind: ['X|{"ez":"-7290289273393613729","trigger_method":"rh_query"}'],
              __subType__: {
                class: "CliqzEZ",
                id: "2700150093133398460",
                name: "Cliqz 1",
              },
            },
          },
        };

        urls = {
          'cliqz.com': true,
        };

        fetching = undefined;

        triggerUrlCache.isCached = function (url) {
          return urls[url] ? true : false;
        };

        triggerUrlCache.retrieve = function (url) {
          return urls[url];
        };

        triggerUrlCache.isStale = function() {
          return false;
        };

        smartCliqzCache.fetchAndStore = function(url) {
          fetching = url;
        };

        smartCliqzCache.retrieve = function(url) {
          return ezs[url];
        };
      });

      afterEach(function() {
        var smartCliqzCache = CliqzUtils.System.get('smart-cliqz-cache/background').default.smartCliqzCache;
        var triggerUrlCache = CliqzUtils.System.get('smart-cliqz-cache/background').default.triggerUrlCache;
        smartCliqzCache.fetchAndStore = ezFetchStore;
        smartCliqzCache.retrieve = ezRetrieve;
        triggerUrlCache.isCached = triggerUrlCacheIsCached;
        triggerUrlCache.retrieve = triggerUrlCacheRetrieve;
        triggerUrlCache.isStale = triggerUrlCacheIsStale;
      });

      it('should trigger ez', function() {
        var ez = Mixer._historyTriggerEZ(result);
        expect(ez).to.equal(ezs[urls['cliqz.com']]);
      });

      it('should not trigger ez but fetch', function() {
        ezs = {};
        var ez = Mixer._historyTriggerEZ(result);
        expect(ez).to.be.undefined;
        expect(fetching).to.equal('cliqz.com');
      });

      it('should trigger ez because no cluster', function() {
        result.data.cluster = false;
        var ez = Mixer._historyTriggerEZ(result);
        expect(ez).to.be.undefined;
      });

      it('should trigger ez because cluster base domain inferred', function() {
        result.data.autoAdd = true;
        var ez = Mixer._historyTriggerEZ(result);
        expect(ez).to.be.undefined;
      });
    });

    describe('filterConflictingEZ', function() {

      var firstResult, ezs;

      beforeEach(function() {
        firstResult = {
          style: 'cliqz-pattern',
          val: 'https://cliqz.com/',
          comment: 'Cliqz',
          label: 'https://cliqz.com/',
          query: 'cliqz.c',
          data: {
            cluster: true,
            urls: [],
          },
        };

        ezs = [
        {
          style: 'cliqz-extra',
          val: 'https://cliqz.com/',
          comment: 'Cliqz',
          label: 'https://cliqz.com/',
          query: 'cliqz.c',
          data: {
              friendly_url: 'cliqz.com',
              template: 'Cliqz',
              subType: '{"class": "CliqzEZ", "ez": "deprecated"}',
              trigger_urls: ['cliqz.com'],
              ts: 1447772162,
              kind: ['X|{"ez":"-7290289273393613729","trigger_method":"rh_query"}'],
              __subType__: {
                class: "CliqzEZ",
                id: "2700150093133398460",
                name: "Cliqz 1",
              },
            },
        },
      ];
      });

      it('should not conflict if history matches', function() {
        var finalExtra = Mixer._filterConflictingEZ(ezs, firstResult);
        expect(finalExtra).to.deep.equal(ezs);
      });

      it('should not conflict if no bet', function() {
        firstResult.val = 'http://facebook.com';
        firstResult.data.cluster = false;
        var finalExtra = Mixer._filterConflictingEZ(ezs, firstResult);
        expect(finalExtra).to.deep.equal(ezs);
      });

      it('should conflict if history bet does not match', function() {
        firstResult.val = 'http://facebook.com';
        var finalExtra = Mixer._filterConflictingEZ(ezs, firstResult);
        expect(finalExtra).to.have.length(0);
      });

      // Will the autocomplete change if we use this EZ?
      it('should conflict if autocomplete does not match', function() {
        firstResult.val = 'http://facebook.com';
        firstResult.cluster = false;
        firstResult.autocompleted = true;
        var finalExtra = Mixer._filterConflictingEZ(ezs, firstResult);
        expect(finalExtra).to.have.length(0);
      });

    });

  });
};
