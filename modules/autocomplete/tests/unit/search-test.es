const expect = chai.expect;

export default describeModule("autocomplete/search",
  function () {
    return {
      "autocomplete/url-complete": { default: {} },
      "core/cliqz": {
        utils: {
          setTimeout,
          log: console.log.bind(console),
          encodeSources() { return []; },
          getDetailsFromUrl: function (url) { return { extra: "", path: "", host: "" }; },
          encodeResultType() { return ""; },
          isCompleteUrl() { return true; },
          generalizeUrl() { },
          setInterval() {},
        }
      },
      "core/console": { default: { log() {} } },
      "autocomplete/calculator": {
        default: {}
      },
      "core/search-engines": {
        default: {}
      },
      "autocomplete/autocomplete": {
        default: {}
      },
      "autocomplete/smart-cliqz-cache/smart-cliqz-cache": {
        default: function() {}
      },
      "autocomplete/smart-cliqz-cache/trigger-url-cache": {
        default: function() {}
      },
      "autocomplete/spell-check": {
        default: function() {}
      },
      "autocomplete/result-providers": {
        default: function() {}
      },
      "core/platform": {
        default: {},
      },
      "autocomplete/history-cluster": {
        default: {}
      },
      "platform/window": { default: {} },
      "core/prefs": { default: {}}
    }
  },
  function () {
    var search;
    beforeEach(function() {
      search = new (this.module().default)();
    });


    describe('enhanceResult', function() {

      it('should add i to each subtype', function() {
        var input = [
          {
            q: 'cinema',
            url: 'http://www.cinema.de/',
            source: 'bm',
            snippet: {
              description: 'Das Kinoprogramm in Deutschland mit allen Neustarts, Filmen, DVDs, dem Filmquiz und vielen Stars, News, Fotos und Insider-Infos: alles rund ums Kino bei CINEMA Online.',
              title: 'Kino bei CINEMA: Kinoprogramm, Filme, DVDs, Stars, Trailer und mehr - Cinema.de',
            },
          },
          {
            q: 'cinema',
            url: 'http://www.cinemaxx.de/',
            source: 'bm',
            snippet: {
              description: 'Aktuelles Kinoprogramm und Filmstarts. Kinotickets gleich online kaufen oder reservieren. Kino in bester Qualität - Willkommen bei CinemaxX',
              title: 'Kino in bester Qualität - Herzlich willkommen in Ihrem CinemaxX.',
            },
          },
          {
            q: 'cinema',
            url: 'http://www.cinema-muenchen.de/',
            source: 'bm',
            snippet: {
              description: 'Startseite',
              title: 'Willkommen bei Cinema München - Cinema München',
            },
          },
        ];

        var results = input.map(search.enhanceResult);

        results.forEach(function(result, i) {
          expect(result.subType).to.contain.key('i');
          expect(result.subType.i).to.equal(i);
        });
      });

      it('should add trigger_method="rh_query" to each RH result subType', function() {
        var input = [
          {
            q: 'cinema',
            url: 'http://www.cinema.de/',
            source: 'rh',
            snippet: {
              description: 'Das Kinoprogramm in Deutschland mit allen Neustarts, Filmen, DVDs, dem Filmquiz und vielen Stars, News, Fotos und Insider-Infos: alles rund ums Kino bei CINEMA Online.',
              title: 'Kino bei CINEMA: Kinoprogramm, Filme, DVDs, Stars, Trailer und mehr - Cinema.de',
            },
          },
          {
            q: 'cinema',
            url: 'http://www.cinemaxx.de/',
            source: 'bm',
            snippet: {
              description: 'Aktuelles Kinoprogramm und Filmstarts. Kinotickets gleich online kaufen oder reservieren. Kino in bester Qualität - Willkommen bei CinemaxX',
              title: 'Kino in bester Qualität - Herzlich willkommen in Ihrem CinemaxX.',
            },
          },
          {
            q: 'cinema',
            url: 'http://www.cinema-muenchen.de/',
            source: 'rh',
            snippet: {
              description: 'Startseite',
              title: 'Willkommen bei Cinema München - Cinema München',
            },
          },
        ];
        var results = input.map(search.enhanceResult);

        results.forEach(function(result, i) {
          if (result.type == 'rh') {
            expect(result.subType).to.contain.key('trigger_method');
            expect(result.subType.trigger_method).to.equal('rh_query');
          }

        });
      });
    });

    describe('isReadyToRender', function() {
      var result;

      beforeEach(function() {
        result = [
            {
              "url": "n/a",
              "trigger_method": "query",
              "snippet": {
                "friendlyUrl": "n/a"
              },
              "subType": {
                "id": "693329100618472949",
                "name": "flightStatus",
                "class": "EntityFlight"
              },
              "trigger": [

              ],
              "_incomplete": true,
              "template": "empty",
              "type": "rh"
            },
            {
              "snippet": {
                "extra": {
                  "alternatives": [
                    "https://www.flightradar24.com/data/flights/lh312"
                  ],
                  "language": {
                    "en": 1.0
                  }
                },
                "_incomplete": true,
                "description": "LH312 (Lufthansa) - Live flight status, scheduled flights, flight arrival and departure times, flight tracks and playback, flight route and airport",
                "title": "Lufthansa flight LH312 - Flightradar24"
              },
              "url": "http://www.flightradar24.com/data/flights/lh312",
              "type": "bm"
            },
          ]
      });

      it('should discard incomplete flight result', function() {
        expect(search.isReadyToRender(result[0])).to.be.false;
      });

      it('should accept incomplete BM result', function() {
        expect(search.isReadyToRender(result[1])).to.be.true;
      });

      it('should discard query-triggered incomplete RH results', function() {
        result[0].url = "http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=775213708&airlineCode=LH&flightNumber=31";
        expect(search.isReadyToRender(result[0])).to.be.false;
      });

      it('should accept url-triggered incomplete RH results', function() {
        result[0].url = "http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?id=775213708&airlineCode=LH&flightNumber=31";
        result[0].trigger_method = "url";
        expect(search.isReadyToRender(result[0])).to.be.true;
      });

    });

    describe('prepareResults', function() {
      var backendResults,
          query;
      beforeEach(function() {
        query = "test";
        backendResults = [
          {
            "url": "https://www.test.de/",
            "trigger_method": "url",
            "snippet": {
              "friendlyUrl": "test.de",
              "description": "Aktuell auf test.de",
              "extra": {
                "alternatives": [
                  "https://www.test.de/"
                ],
                "language": {
                  "de": 1
                }
              },
              "title": "Stiftung Warentest",
              "deepResults": [
                {
                  "type": "buttons",
                  "links": [
                    {
                      "url": "https://www.test.de/multimedia/",
                      "title": "Multimedia"
                    },
                    {
                      "url": "https://www.test.de/versicherungen/",
                      "title": "Versicherungen"
                    }
                  ]
                }
              ]
            },
            "subType": {
              "id": "7801272701895296277",
              "name": "test.de",
              "class": "EntityGeneric",
              "i": 0
            },
            "trigger": [
              "test.de"
            ],
            "template": "generic",
            "type": "rh"
          },
          {
            "snippet": {
              "extra": {
                "alternatives": [
                  "http://www.testberichte.de/"
                ],
                "language": {
                  "de": 1
                }
              },
              "description": "Testberichte.de: Mehr als 685.000 Testergebnisse im Überblick",
              "title": "Test"
            },
            "url": "http://www.testberichte.de/",
            "type": "bm",
            "subType": {
              "i": 1
            }
          }
        ]
        search.instant = [];
        search.cliqzResults = JSON.parse(JSON.stringify(backendResults));
      });

      it('should change url to val', function() {
        search.prepareResults(query);
        backendResults.forEach(function(res, i) {
          expect(search.cliqzResults[i].val).to.equal(res.url);
        });
      });

      it('should assign style that contains "cliqz-extra" to rh results, "cliqz-results" to bm results', function() {
        search.prepareResults(query);
        backendResults.forEach(function(res, i) {
          expect(search.cliqzResults[i].style).to.contain(
            res.type === 'rh' ? 'cliqz-extra' : 'cliqz-results'
          );
        });
      });

      it('should change title to comment', function() {
        search.prepareResults(query);
        backendResults.forEach(function(res, i) {
          expect(search.cliqzResults[i].comment).to.equal(res.snippet.title);
        });
      });

      it('should set query for each result', function() {
        search.prepareResults(query);
        backendResults.forEach(function(res, i) {
          expect(search.cliqzResults[i]).to.contain.key("query");
          expect(search.cliqzResults[i].query).to.equal(query);
        });
      });

      it('should contain data', function() {
        search.prepareResults(query);
        backendResults.forEach(function(res, i) {
          expect(search.cliqzResults[i]).to.contain.key("data");
          expect(search.cliqzResults[i].data).to.be.ok;
        });
      });

    });

  }
);
