/* global it, expect, chai, chai-dom, respondWith, fillIn, waitForPopup,
          $cliqzResults, withHistory, CliqzUtils, window */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

export default function () {
  context('for a history and news rich header', function () {
    const results = [
      {
        url: 'http://www.bild.de/',
        score: 437043,
        source: 'bm',
        snippet: {
          deepResults: [
            {
              links: [
                {
                  extra: {
                    amp_url: '',
                    creation_timestamp: 1500390868,
                    description: 'Die Analyse eines exklusiven Satellitenbilds zeigt, dass die USA im Norden Syriens eine Luftwaffenbasis errichtet haben. Foto: , YouTube/BBC Newsnight, TERRA server',
                    domain: 'bild.de',
                    hash_url: '0a9d3374366d0e8850ba04799575d03c9c3f549c',
                    media: 'http://bilder.bild.de/fotos/qf-geheimbasis_200450378_mbqf-1499954661-52538792/Bild/1,club=bildplus.bild.jpg',
                    mobile_url: '',
                    score: 33342.01928888889,
                    sources: [
                      'Cluster101'
                    ],
                    thumbnail: 'http://bilder.bild.de/fotos/qf-geheimbasis_200450378_mbqf-1499954661-52538792/Bild/1,club=bildplus.bild.jpg',
                    timestamp: 1500390868,
                    tweet_count: 0
                  },
                  title: '*** BILDplus Inhalt *** Exklusives Satellitenbild - Trumps geheime Luftwaffenbasis in Syrien',
                  url: 'http://www.bild.de/bild-plus/politik/ausland/donald-trump/s-geheime-basis-52515400.bild.html'
                },
                {
                  extra: {
                    amp_url: '',
                    creation_timestamp: 1500384176,
                    description: 'Den FC Rot-Weiß Erfurt in die erste Liga führen oder mit Sportfreunde Lotte Erstligisten aufmischen – in „Fifa 18“ ist das endlich möglich! Foto: Hersteller',
                    domain: 'bild.de',
                    hash_url: '8298c45fb3e17e1f03eadeaa5b607710e925d94c',
                    media: 'http://bilder.bild.de/fotos/fifa-18-mit-einer-dicken-ueberraschung-200451608-52581418/Bild/2.bild.jpg',
                    mobile_url: '',
                    score: 33341.87057777778,
                    sources: [
                      'Cluster101'
                    ],
                    thumbnail: 'http://bilder.bild.de/fotos/fifa-18-mit-einer-dicken-ueberraschung-200451608-52581418/Bild/2.bild.jpg',
                    timestamp: 1500384176,
                    tweet_count: 0
                  },
                  title: 'Neue Wettbewerbe - „Fifa 18“ mit 3. Liga ​und dieser Überraschung',
                  url: 'http://www.bild.de/spiele/spiele-news/fifa/fifa-18-dritte-liga-52573576.bild.html'
                },
              ],
              type: 'news'
            },
            {
              links: [
                {
                  rank: 25977.53125,
                  title: 'SPORT BILD',
                  url: 'http://www.sportbild.bild.de'
                },
                {
                  rank: 17443.90322580645,
                  title: 'Bundesliga',
                  url: 'http://www.bild.de/bundesliga/1-liga/home-1-bundesliga-fussball-news-31035072.bild.html'
                },
                {
                  rank: 16854.000000000004,
                  title: 'Sport',
                  url: 'http://www.bild.de/sport/startseite/sport/sport-home-15479124.bild.html'
                },
                {
                  rank: 9261.266666666665,
                  title: 'Der Tag bei BILD.de',
                  url: 'http://www.bild.de/schlagzeilen-des-tages/ateaserseite/der-tag-bei-bild/ateaserseite-15480098.bild.html'
                }
              ],
              type: 'buttons'
            }
          ],
          description: 'BILD.de: Die Seite 1 für aktuelle Nachrichten und Themen, Bilder und Videos aus den Bereichen News, Wirtschaft, Politik, Show, Sport, und Promis.',
          extra: {
            domain: 'bild.de'
          },
          friendlyUrl: 'bild.de',
          title: 'Aktuelle Nachrichten- Bild.de'
        },
        c_url: 'http://www.bild.de/',
        type: 'rh',
        subType: {
          class: 'EntityNews',
          id: '2029041446277385111',
          name: 'NEWS:::bild.de:::Bild'
        },
        template: 'entity-news-1',
        trigger: [
          'bild.de'
        ],
        trigger_method: 'url'
      }
    ];
    const historyResults = [
      {
        style: 'favicon',
        value: 'https://cliqz.com/',
        image: '',
        comment: 'Cliqz',
        label: '',
      },
      {
        style: 'favicon',
        value: 'https://cliqz.com/aboutus',
        image: '',
        comment: 'About us',
        label: '',
      },

    ];
    const historyResultsSelector = '.history:not(.last)';
    let resultElement;
    let historyItems;
    let historyIndex;

    before(function () {
      respondWith({ results });
      withHistory(historyResults);
      fillIn('cliqz');
      return waitForPopup().then(function () {
        resultElement = $cliqzResults()[0];
        historyItems = resultElement.querySelectorAll(historyResultsSelector);
      });
    });

    beforeEach(function () {
      historyIndex = historyItems.length;
    });

    describe('renders history results', function () {
      it('successfully', function () {
        chai.expect(historyItems).to.not.be.empty;
      });

      it('in correct amount', function () {
        chai.expect(historyItems.length).to.equal(historyResults.length);
      });

      it('with an option to search in all history results', function () {
        const historySearchSelector = '.history.last';
        const historySearchItem = resultElement.querySelectorAll(historySearchSelector);
        chai.expect(historySearchItem).to.exist;
      });
    });

    context('each rendered history result', function () {
      it('has an existing logo', function () {
        const historyLogoSelector = 'span.logo';

        [...historyItems].forEach(function (history) {
          chai.expect(history.querySelector(historyLogoSelector)).to.exist;
        });
      });

      it('has an existing and correct description', function () {
        const historyDescriptionSelector = 'div.abstract span.title';

        [...historyItems].forEach(function (history) {
          /* The order of history in dropdown is reverted */
          historyIndex -= 1;
          chai.expect(history.querySelector(historyDescriptionSelector))
            .to.contain.text(historyResults[historyIndex].comment);
        });
      });

      it('has an existing domain', function () {
        const historyUrlSelector = 'div.abstract span.url';

        [...historyItems].forEach(function (history) {
          chai.expect(history.querySelector(historyUrlSelector)).to.exist;
        });
      });

      it('links to a correct URL', function () {
        const historyLinkSelector = 'a.result';

        [...historyItems].forEach(function (history) {
          /* The order of history in dropdown is reverted */
          historyIndex -= 1;
          chai.expect(history.querySelector(historyLinkSelector).href)
            .to.equal(historyResults[historyIndex].value);
        });
      });
    });

    context('the option to search in all history results', function () {
      it('has an existing and correct icon', function () {
        const historySearchIconSelector = '.history.last span.history-tool';
        const historySearchIcon = resultElement.querySelector(historySearchIconSelector);
        chai.expect(historySearchIcon).to.exist;

        const win = CliqzUtils.getWindow();
        chai.expect(win.getComputedStyle(
          resultElement.querySelector(historySearchIconSelector)).backgroundImage)
          .to.contain('history_tool_grey');
      });

      it('has existing and correct text', function () {
        const historySearchTextSelector = '.history.last div.abstract span';
        const historySearchText = resultElement.querySelector(historySearchTextSelector);
        const locale = CliqzUtils.locale.default || CliqzUtils.locale[window.navigator.language];
        const foundInHistory = locale.results_found_in_history.message;
        chai.expect(historySearchText).to.contain.text(foundInHistory);
      });
    });
  });
}
