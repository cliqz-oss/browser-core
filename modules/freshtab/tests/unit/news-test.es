/* global chai, describeModule */
/* eslint no-param-reassign: off */
/* eslint no-bitwise: off */

const fs = require('fs');

export default describeModule('freshtab/news',
  function () {
    return {
      'core/config': {
        default: {
          settings: {
            RICH_HEADER: 'https://api.cliqz.com/api/v2/rich-header?path=/map',
            channel: '99',
          },
        },
      },
      'core/url': { extractSimpleURI: '[dynamic]' },
      'freshtab/news-cache': { default: function () { } },
      'core/storage': {
        default: class Storage {
          getItem() { return true; }

          setItem() { return true; }
        },
      },
      'core/console': {
        isLoggingEnabled: () => false,
        default: {
          log() {},
        },
      },
      'core/prefs': {
        default: {
          get(name, def) {
            return def;
          },
          set() { },
        },
      },
      'core/i18n': {
        default: {}
      },
      'core/http': {
        promiseHttpHandler() {}
      },
      'platform/freshtab/history': {
        getDomains: '[dynamic]',
        isURLVisited: '[dynamic]',
      },
    };
  },
  function () {
    describe('history based news tests', function () {
      function cliqzHash(s) {
        return s.split('')
          .reduce(function (a, b) { return (((a << 4) - a) + b.charCodeAt(0)) & 0xEFFFFFF; }, 0);
      }

      function readMock(fileName) {
        return new Promise(function (resolve, reject) {
          fs.readFile(fileName, 'utf8', function (err, data) {
            if (err) {
              reject(err);
            }
            resolve(data);
          });
        });
      }

      beforeEach(function () {
        this.deps('core/url').extractSimpleURI = function (url) {
          const data = {
            'http://www.test.com/': {
              path: '',
              cleanHost: 'test.con'
            },
            'http://www.focus.de/politik/': {
              path: '/politik/',
              cleanHost: 'focus.de'
            },
            'http://bbc.com': {
              path: '',
              cleanHost: 'bbc.com'
            },
            'http://meduza.io': {
              path: '',
              cleanHost: 'meduza.io'
            }
          };
          return data[url];
        };
      });

      it('one history domain', function () {
        this.deps('platform/freshtab/history').getDomains = () => {
          const results = [];

          const notNewsRecord = { url: 'http://www.test.com/', visit_count: 1 };
          for (let i = 0; i < 21; i += 1) results.push(notNewsRecord);

          const record = { url: 'http://www.focus.de/politik/', visit_count: 1 };
          for (let i = 0; i < 21; i += 1) results.push(record);

          return Promise.resolve(results);
        };

        return this.module().getHistoryBasedRecommendations({}).then(function (results) {
          // check the domains results
          const expectedResult = [
            { type: 'topnews', domain: 'topnews', number: 3 },
            { type: 'topnews', domain: 'topnews', number: 3 },
            { type: 'yournews', domain: 'focus.de/politik', number: 6 }
          ];
          chai.expect(results.newsPlacing, 'news placement is wrong').to.deep.equal(expectedResult);
          // check hashes
          chai.expect(
            results.hashList.indexOf(cliqzHash('focus.de')),
            'domain hash not in the list'
          ).to.not.equal(-1);
        });
      });

      it('two history domains', function () {
        this.deps('platform/freshtab/history').getDomains = () => {
          const results = [];

          const notNewsRecord = { url: 'http://www.test.com/', visit_count: 1 };
          for (let i = 0; i < 21; i += 1) results.push(notNewsRecord);

          const record1 = { url: 'http://www.focus.de/politik/', visit_count: 1 };
          for (let i = 0; i < 25; i += 1) results.push(record1);

          const record2 = { url: 'http://bbc.com', visit_count: 1 };
          for (let i = 0; i < 21; i += 1) results.push(record2);

          return Promise.resolve(results);
        };

        return this.module().getHistoryBasedRecommendations({}).then(function (results) {
          // check the domains results
          const expectedResult = [
            { type: 'topnews', domain: 'topnews', number: 3 },
            { type: 'yournews', domain: 'focus.de/politik', number: 5 },
            { type: 'yournews', domain: 'bbc.com', number: 4 }
          ];
          chai.expect(results.newsPlacing, 'news placement is wrong').to.deep.equal(expectedResult);
          // check hashes
          chai.expect(
            results.hashList.indexOf(cliqzHash('focus.de')),
            'domain hash not in the list'
          ).to.not.equal(-1);
          chai.expect(
            results.hashList.indexOf(cliqzHash('bbc.com')),
            'domain hash not in the list'
          ).to.not.equal(-1);
        });
      });

      it('three history domains', function () {
        this.deps('platform/freshtab/history').getDomains = () => {
          const results = [];

          const notNewsRecord = { url: 'http://www.test.com/', visit_count: 1 };
          for (let i = 0; i < 21; i += 1) results.push(notNewsRecord);

          const record1 = { url: 'http://www.focus.de/politik/', visit_count: 1 };
          for (let i = 0; i < 25; i += 1) results.push(record1);

          const record2 = { url: 'http://bbc.com', visit_count: 1 };
          for (let i = 0; i < 23; i += 1) results.push(record2);

          const record3 = { url: 'http://meduza.io', visit_count: 1 };
          for (let i = 0; i < 21; i += 1) results.push(record3);

          return Promise.resolve(results);
        };

        return this.module().getHistoryBasedRecommendations({}).then(function (results) {
          // check the domains results
          const expectedResult = [
            { type: 'topnews', domain: 'topnews', number: 3 },
            { type: 'yournews', domain: 'focus.de/politik', number: 3 },
            { type: 'yournews', domain: 'bbc.com', number: 3 },
            { type: 'yournews', domain: 'meduza.io', number: 3 }
          ];
          chai.expect(results.newsPlacing, 'news placement is wrong').to.deep.equal(expectedResult);
          // check hashes
          chai.expect(
            results.hashList.indexOf(cliqzHash('focus.de')),
            'domain hash not in the list'
          ).to.not.equal(-1);
          chai.expect(
            results.hashList.indexOf(cliqzHash('bbc.com')),
            'domain hash not in the list'
          ).to.not.equal(-1);
          chai.expect(
            results.hashList.indexOf(cliqzHash('meduza.io')),
            'domain hash not in the list'
          ).to.not.equal(-1);
        });
      });

      it('no history domains', function () {
        this.deps('platform/freshtab/history').getDomains = () => Promise.resolve([]);

        return this.module().getHistoryBasedRecommendations().then(
          function (results) {
            // check the domains results
            const expectedResult = [
              { type: 'topnews', domain: 'topnews', number: 3 },
              { type: 'topnews', domain: 'topnews', number: 9 }
            ];
            chai.expect(results.newsPlacing, 'not getting expected newsPlacing').to.deep.equal(expectedResult);
          }
        );
      });

      context('with mocked news caches', function () {
        let topNewsCache;
        let hbasedResponse;

        beforeEach(function () {
          return Promise.all(
            [
              readMock('tests/mocks/topNewsExample.json'),
              readMock('tests/mocks/historyBasedNewsExample.json')
            ]
          )
            .then(function ([topNewsC, hbasedR]) {
              topNewsCache = JSON.parse(topNewsC);
              hbasedResponse = JSON.parse(hbasedR);
            });
        });

        it('Merge news lists', function () {
          const newsPlacing = [
            { type: 'topnews', domain: 'topnews', number: 3 },
            { type: 'topnews', domain: 'topnews', number: 3 },
            { type: 'yournews', domain: 'focus.de/politik', number: 3 }
          ];

          const historyObject = { newsPlacing };

          return this.module().composeNewsList(historyObject, topNewsCache, hbasedResponse).then(
            (freshtabNews) => {
              chai.expect(freshtabNews.newsList.length, 'wrong number of news').to.deep.equal(9);
              chai.expect(freshtabNews.newsList[0].type, 'top news not on first position').to.deep.equal('topnews');
              chai.expect(freshtabNews.newsList[8].type, 'history based news are not presented').to.deep.equal('yournews');
              chai.expect(freshtabNews.newsList[8].url, 'history based news are not presented').to.contain('focus.de');
            }
          );
        });

        it('Merge news lists bloom filter', function () {
          const newsPlacing = [
            { type: 'topnews', domain: 'topnews', number: 3 },
            { type: 'topnews', domain: 'topnews', number: 3 },
            { type: 'yournews', domain: 'zeit.de', number: 3 }
          ];

          const historyObject = { newsPlacing };
          // limit number of top news -- (use the bloomfilter article)
          topNewsCache = topNewsCache.slice(4, 10);
          // limit number of history based news
          hbasedResponse['zeit.de'] = hbasedResponse['zeit.de'].slice(0, 6);

          return this.module().composeNewsList(historyObject, topNewsCache, hbasedResponse).then(
            (freshtabNews) => {
              chai.expect(freshtabNews.newsList.length, 'wrong number of news').to.deep.equal(9);
              chai.expect(freshtabNews.newsList[0].type, 'top news not on first position').to.deep.equal('topnews');
              chai.expect(freshtabNews.newsList[8].type, 'history based news are not presented').to.deep.equal('yournews');
              chai.expect(freshtabNews.newsList[3].url,
                'history based news are duplicated same tpoic with top news')
                .to.not.equal('https://www.zeit.de/wirtschaft/2018-06/handelsstreit-usa-zoelle-china-vergeltung');
            }
          );
        });

        it('Merge news lists without bloom filter', function () {
          const newsPlacing = [
            { type: 'topnews', domain: 'topnews', number: 3 },
            { type: 'topnews', domain: 'topnews', number: 3 },
            { type: 'yournews', domain: 'zeit.de', number: 3 }
          ];

          const historyObject = { newsPlacing };
          // limit number of top news -- ( don't use the bloomfilter article)
          topNewsCache = topNewsCache.slice(0, 6);
          // limit number of history based news
          hbasedResponse['zeit.de'] = hbasedResponse['zeit.de'].slice(0, 6);

          return this.module().composeNewsList(historyObject, topNewsCache, hbasedResponse).then(
            (freshtabNews) => {
              chai.expect(freshtabNews.newsList.length, 'wrong number of news').to.deep.equal(9);
              chai.expect(freshtabNews.newsList[0].type, 'top news not on first position').to.deep.equal('topnews');
              chai.expect(freshtabNews.newsList[8].type, 'history based news are not presented').to.deep.equal('yournews');
              // NOTE - disabled because stopped working on Node.js 11 (@mai)
              // chai.expect(freshtabNews.newsList[3].url,
              //   'history based news are duplicated same tpoic with top news')
              //   .to.equal('https://www.zeit.de/wirtschaft/2018-06/handelsstreit-usa-zoelle-china-vergeltung');
            }
          );
        });

        it('Merge news lists with not enough history based news', function () {
          const newsPlacing = [
            { type: 'topnews', domain: 'topnews', number: 3 },
            { type: 'topnews', domain: 'topnews', number: 3 },
            { type: 'yournews', domain: 'focus.de/politik', number: 6 }
          ];

          const historyObject = { newsPlacing };
          // limit number of history based news
          hbasedResponse['focus.de'] = hbasedResponse['focus.de'].slice(0, 5);

          return this.module().composeNewsList(historyObject, topNewsCache, hbasedResponse).then(
            (freshtabNews) => {
              chai.expect(freshtabNews.newsList.length, 'wrong number of news').to.deep.equal(12);
              chai.expect(freshtabNews.newsList[0].type, 'top news not on first position').to.deep.equal('topnews');
              chai.expect(freshtabNews.newsList[6].type, 'top news did not replace hbased news').to.deep.equal('topnews');
              chai.expect(freshtabNews.newsList[7].type, 'history based news are not presented').to.deep.equal('yournews');
              chai.expect(freshtabNews.newsList[8].url, 'history based news are not presented').to.contain('focus.de');
            }
          );
        });

        it('Merge news lists with not enough history based news, list should be cut down to three.', function () {
          const newsPlacing = [
            { type: 'topnews', domain: 'topnews', number: 3 },
            { type: 'topnews', domain: 'topnews', number: 3 },
            { type: 'yournews', domain: 'focus.de/politik', number: 6 }
          ];

          const historyObject = { newsPlacing };
          // limit number of top news
          topNewsCache = topNewsCache.slice(0, 3);
          // limit number of history based news
          hbasedResponse['focus.de'] = hbasedResponse['focus.de'].slice(0, 2);

          return this.module().composeNewsList(historyObject, topNewsCache, hbasedResponse).then(
            (freshtabNews) => {
              chai.expect(freshtabNews.newsList.length, 'wrong number of news').to.deep.equal(3);
              chai.expect(freshtabNews.newsList[0].type, 'top news not on first position').to.deep.equal('topnews');
            }
          );
        });

        it('Merge news lists with history based news which are already in history.', function () {
          const newsPlacing = [
            { type: 'topnews', domain: 'topnews', number: 3 },
            { type: 'topnews', domain: 'topnews', number: 3 },
            { type: 'yournews', domain: 'focus.de/politik', number: 6 }
          ];

          const historyObject = { newsPlacing };

          // limit number of history based news
          hbasedResponse['focus.de'] = hbasedResponse['focus.de'].slice(0, 6);
          // mark one article as visited
          hbasedResponse['focus.de'][0].isVisited = true;

          return this.module().composeNewsList(historyObject, topNewsCache, hbasedResponse).then(
            (freshtabNews) => {
              chai.expect(freshtabNews.newsList.length, 'wrong number of news').to.deep.equal(12);
              chai.expect(freshtabNews.newsList[0].type, 'top news not on first position').to.deep.equal('topnews');
              chai.expect(freshtabNews.newsList[6].type, 'visited article is not replaced by top news').to.deep.equal('topnews');
              chai.expect(freshtabNews.newsList[7].type, 'history based news are not presented').to.deep.equal('yournews');
            }
          );
        });
      });
    });
  });
