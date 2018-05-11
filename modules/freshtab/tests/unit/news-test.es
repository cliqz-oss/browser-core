const fs = require('fs');

export default describeModule("freshtab/news",
  function () {
    return {
      "core/config": { default: { } },
      "core/url": { extractSimpleURI: '[dynamic]' },
      "core/language": { default: { } },
      "platform/places-utils": { default: { } },
      "freshtab/news-cache": { default: function () { } },
      "core/utils": {
        default: {
          log(message) {console.log(message)},
          setTimeout,
          clearTimeout,
        },
      },
      "core/cliqz": {
        historyManager: {
          PlacesInterestsStorage : {},
          makeURI() {return '';},
          getHistoryService() {
              return {
                executeQuery() {
                  return {
                    root: {
                      containerOpen: false,
                      childCount: 0
                    }
                  };
                },
                getNewQueryOptions() {
                  return '';
                },
                getNewQuery() {
                  return {beginTimeReference: 0,
                          beginTime: 0,
                          endTimeReference: 0,
                          TIME_RELATIVE_NOW: 0,
                          endTime: 0,
                          uri: ''
                        }
                  }
              }
          }
        }
      }
    }
  },
  function() {
    describe("history based news tests", function () {
      function cliqzHash(s){
        return s.split('').reduce(function(a,b){ return (((a<<4)-a)+b.charCodeAt(0)) & 0xEFFFFFF}, 0)
      }

      function readMock(fileName) {
        return new Promise(function (resolve, reject) {
          fs.readFile(fileName, 'utf8', function (err, data) {
            if (err) {
              console.log(err);
              reject(err);
            }
            resolve(data);
          });
        })
      }

      beforeEach(function() {

        this.deps("core/utils").default.getPref = function (prefName, defaultPref) {
          return defaultPref;
        };

        this.deps("core/utils").default.setPref = function (prefName, defaultPref) {
          console.log("prefName");
          return true;
        };

        this.deps("core/utils").default.log = function() {};

        this.deps("core/url").extractSimpleURI = function(url) {
          var data = {
            "http://www.test.com/": {
              path: "",
              cleanHost: "test.con"
            },
            "http://www.focus.de/politik/": {
              path: "/politik/",
              cleanHost: "focus.de"
            },
            "http://bbc.com": {
              path: "",
              cleanHost: "bbc.com"
            },
            "http://meduza.io": {
              path: "",
              cleanHost: "meduza.io"
            }
          };
          return data[url];
        };


        this.deps("core/utils").default.encodeLocale = function() {return '';}

        this.deps("core/utils").default.RICH_HEADER = "https://api.cliqz.com/api/v1/rich-header?path=/map";

        this.deps("core/utils").default.hash = cliqzHash;

        this.deps("core/utils").default.log = function(mes){ console.log(mes); };

        this.deps("core/language").default.stateToQueryString = function() {return '&lang=en';};

        this.deps("core/utils").default.getLocalStorage = function (locale_storage) {
          return {
            getItem() { return true },
            setItem: function(itemName) {return true;}
          };
        }

      });

      it("one history domain", function () {

        this.deps("core/cliqz").historyManager.PlacesInterestsStorage._execute =
          function (SQL_statment, sql_input, iterative_function, SQL_parameters) {

            var not_news_record = { url: "http://www.test.com/", visit_count: 1};
            for (var i = 0; i < 21; i++) iterative_function(not_news_record);

            var record = { url: "http://www.focus.de/politik/", visit_count: 1};
            for (var i = 0; i < 21; i++) iterative_function(record);

            return Promise.resolve();
          };

        return this.module().getHistoryBasedRecommendations({}).then(function(results){

          // check the domains results
          const expectedResult = [{"type":"topnews","domain":"topnews","number":3},
                                  {"type":"topnews","domain":"topnews","number":3},
                                  {"type":"yournews","domain":"focus.de/politik","number":6}];
          chai.expect(results['newsPlacing'], 'news placement is wrong').to.deep.equal(expectedResult);
          // check hashes
          chai.expect(
            results['hashList'].indexOf(cliqzHash('focus.de')),
            'domain hash not in the list'
            ).to.not.equal(-1);
        });
      });

      it("two history domains", function () {

        this.deps("core/cliqz").historyManager.PlacesInterestsStorage._execute =
          function (SQL_statment, sql_input, iterative_function, SQL_parameters) {

            var not_news_record = { url: "http://www.test.com/", visit_count: 1};
            for (var i = 0; i < 21; i++) iterative_function(not_news_record);

            var record1 = { url: "http://www.focus.de/politik/", visit_count: 1};
            for (var i = 0; i < 25; i++) iterative_function(record1);

            var record2 = { url: "http://bbc.com", visit_count: 1};
            for (var i = 0; i < 21; i++) iterative_function(record2);

            return Promise.resolve();
          };

        return this.module().getHistoryBasedRecommendations({}).then(function(results){

          // check the domains results
          const expectedResult = [{"type":"topnews","domain":"topnews","number":3},
                                  {"type":"yournews","domain":"focus.de/politik","number":5},
                                  {"type":"yournews","domain":"bbc.com","number":4}];
          chai.expect(results['newsPlacing'], 'news placement is wrong').to.deep.equal(expectedResult);
          // check hashes
          chai.expect(
            results['hashList'].indexOf(cliqzHash('focus.de')),
            'domain hash not in the list'
            ).to.not.equal(-1);
          chai.expect(
            results['hashList'].indexOf(cliqzHash('bbc.com')),
            'domain hash not in the list'
            ).to.not.equal(-1);
        });
      });

      it("three history domains", function () {

        this.deps("core/cliqz").historyManager.PlacesInterestsStorage._execute =
          function (SQL_statment, sql_input, iterative_function, SQL_parameters) {

            var not_news_record = { url: "http://www.test.com/", visit_count: 1};
            for (var i = 0; i < 21; i++) iterative_function(not_news_record);

            var record1 = { url: "http://www.focus.de/politik/", visit_count: 1};
            for (var i = 0; i < 25; i++) iterative_function(record1);

            var record2 = { url: "http://bbc.com", visit_count: 1};
            for (var i = 0; i < 23; i++) iterative_function(record2);

            var record3 = { url: "http://meduza.io", visit_count: 1};
            for (var i = 0; i < 21; i++) iterative_function(record3);

            return Promise.resolve();
          };

        return this.module().getHistoryBasedRecommendations({}).then(function(results){

          // check the domains results
          const expectedResult = [{"type":"topnews","domain":"topnews","number":3},
                                  {"type":"yournews","domain":"focus.de/politik","number":3},
                                  {"type":"yournews","domain":"bbc.com","number":3},
                                  {"type":"yournews","domain":"meduza.io","number":3}];
          chai.expect(results['newsPlacing'], 'news placement is wrong').to.deep.equal(expectedResult);
          // check hashes
          chai.expect(
            results['hashList'].indexOf(cliqzHash('focus.de')),
            'domain hash not in the list'
            ).to.not.equal(-1);
          chai.expect(
            results['hashList'].indexOf(cliqzHash('bbc.com')),
            'domain hash not in the list'
            ).to.not.equal(-1);
          chai.expect(
            results['hashList'].indexOf(cliqzHash('meduza.io')),
            'domain hash not in the list'
            ).to.not.equal(-1);
        });
      });

      it("no history domains", function () {

        this.deps("core/cliqz").historyManager.PlacesInterestsStorage._execute =
        function (SQL_statment, sql_input, iterative_function, SQL_parameters) {

          return Promise.resolve();
        }

        return this.module().getHistoryBasedRecommendations().then(
          function(results){
              // check the domains results
              const expectedResult = [{"type":"topnews","domain":"topnews","number":3},{"type":"topnews","domain":"topnews","number":9}];
              chai.expect(results['newsPlacing'], 'not getting expected newsPlacing').to.deep.equal(expectedResult);
            }
          );
      });

      context("with mocked news caches", function () {
        let topNewsCache,
          hbasedResponse;

        beforeEach(function () {
          return Promise.all([
                  readMock('tests/mocks/topNewsExample.json'),
                  readMock('tests/mocks/historyBasedNewsExample.json')
          ]).then(function ([topNewsC, hbasedR]) {
            topNewsCache = JSON.parse(topNewsC);
            hbasedResponse = JSON.parse(hbasedR);
          });
        });

        it("Merge news lists", function () {

          const newsPlacing = [{"type":"topnews","domain":"topnews","number":3},
                          {"type":"topnews","domain":"topnews","number":3},
                          {"type":"yournews","domain":"focus.de/politik","number":3}];

          var historyObject = {newsPlacing};

          return this.module().composeNewsList(historyObject, topNewsCache, hbasedResponse).then(
            freshtabNews => {
              chai.expect(freshtabNews.newsList.length, 'wrong number of news').to.deep.equal(9);
              chai.expect(freshtabNews.newsList[0].type, 'top news not on first position').to.deep.equal("topnews");
              chai.expect(freshtabNews.newsList[8].type, 'history based news are not presented').to.deep.equal("yournews");
              chai.expect(freshtabNews.newsList[8].url, 'history based news are not presented').to.contain('focus.de');
            }
          );
        });

        it("Merge news lists with not enough history based news", function () {

          const newsPlacing = [{"type":"topnews","domain":"topnews","number":3},
                          {"type":"topnews","domain":"topnews","number":3},
                          {"type":"yournews","domain":"focus.de/politik","number":6}];

          var historyObject = {newsPlacing};
          // limit number of history based news
          hbasedResponse['focus.de'] = hbasedResponse['focus.de'].slice(0, 5);

          return this.module().composeNewsList(historyObject, topNewsCache, hbasedResponse).then(
            freshtabNews => {
              console.log(freshtabNews);
              chai.expect(freshtabNews.newsList.length, 'wrong number of news').to.deep.equal(12);
              chai.expect(freshtabNews.newsList[0].type, 'top news not on first position').to.deep.equal("topnews");
              chai.expect(freshtabNews.newsList[6].type, 'top news did not replace hbased news').to.deep.equal("topnews");
              chai.expect(freshtabNews.newsList[7].type, 'history based news are not presented').to.deep.equal("yournews");
              chai.expect(freshtabNews.newsList[8].url, 'history based news are not presented').to.contain('focus.de');
            }
          );
        });

        it("Merge news lists with not enough history based news, list should be cut down to three.", function () {
          const newsPlacing = [{"type":"topnews","domain":"topnews","number":3},
                          {"type":"topnews","domain":"topnews","number":3},
                          {"type":"yournews","domain":"focus.de/politik","number": 6}];

          var historyObject = {newsPlacing};
          // limit number of top news
          topNewsCache = topNewsCache.slice(0, 3);
          // limit number of history based news
          hbasedResponse['focus.de'] = hbasedResponse['focus.de'].slice(0, 2);

          return this.module().composeNewsList(historyObject, topNewsCache, hbasedResponse).then(
            freshtabNews => {
              console.log(freshtabNews);
              chai.expect(freshtabNews.newsList.length, 'wrong number of news').to.deep.equal(3);
              chai.expect(freshtabNews.newsList[0].type, 'top news not on first position').to.deep.equal("topnews");
            }
          );
        });

        it("Merge news lists with history based news which are already in history.", function () {
          const newsPlacing = [{"type":"topnews","domain":"topnews","number":3},
                          {"type":"topnews","domain":"topnews","number":3},
                          {"type":"yournews","domain":"focus.de/politik","number":6}];

          var historyObject = {newsPlacing};

          // limit number of history based news
          hbasedResponse['focus.de'] = hbasedResponse['focus.de'].slice(0, 6);
          // mark one article as visited
          hbasedResponse['focus.de'][0]['isVisited'] = true

          return this.module().composeNewsList(historyObject, topNewsCache, hbasedResponse).then(
            freshtabNews => {
              console.log(freshtabNews);
              chai.expect(freshtabNews.newsList.length, 'wrong number of news').to.deep.equal(12);
              chai.expect(freshtabNews.newsList[0].type, 'top news not on first position').to.deep.equal("topnews");
              chai.expect(freshtabNews.newsList[6].type, 'visited article is not replaced by top news').to.deep.equal("topnews");
              chai.expect(freshtabNews.newsList[7].type, 'history based news are not presented').to.deep.equal("yournews");
            }
          );
        });

      });
    });
  }
);
