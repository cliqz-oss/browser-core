/* global it, expect, chai, chai-dom, respondWith, fillIn, waitForPopup, $cliqzResults */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

export default function () {
  context('for a news rich header', function () {
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
                {
                  extra: {
                    amp_url: '',
                    creation_timestamp: 1500377535,
                    description: 'Dreckige Luft in München: Vielerorts in der Landeshauptstadt werden Stickstoffdioxid-Grenzwerte überschritten.Teilweise sogar massiv!I Foto: Wolfgang Maria Weber',
                    domain: 'bild.de',
                    hash_url: '47bc6bc86ccc8ec65c501cf4756b93126ae9a7d6',
                    media: 'http://bilder.bild.de/fotos/vielerorts-werden-in-der-landeshauptstadt-stickstoffdioxid-grenzwerte-ueberschritten-200221305-52586124/Bild/2.bild.jpg',
                    mobile_url: '',
                    score: 33341.723,
                    sources: [
                      'Cluster101'
                    ],
                    thumbnail: 'http://bilder.bild.de/fotos/vielerorts-werden-in-der-landeshauptstadt-stickstoffdioxid-grenzwerte-ueberschritten-200221305-52586124/Bild/2.bild.jpg',
                    timestamp: 1500377535,
                    tweet_count: 0
                  },
                  title: 'Grenzwert überschritten - Dreckige Luft in München',
                  url: 'http://www.bild.de/regional/muenchen/luftverschmutzung/in-muenchen-strassen-52586060.bild.html'
                }
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
    let resultElement;

    before(function () {
      respondWith({ results });
      fillIn('bild');
      return waitForPopup().then(function () {
        resultElement = $cliqzResults()[0];
      });
    });

    describe('renders a parent news result', function () {
      it('successfully', function () {
        const parentNewsSelector = 'a.result';
        chai.expect(resultElement.querySelector(parentNewsSelector)).to.exist;
      });

      it('with existing and correct title', function () {
        const parentNewsTitleSelector = 'a.result div.abstract p span.title';
        chai.expect(resultElement.querySelector(parentNewsTitleSelector)).to.exist;
        chai.expect(resultElement.querySelector(parentNewsTitleSelector))
        .to.have.text(results[0].snippet.title);
      });

      it('with existing and correct domain', function () {
        const parentNewsDomainSelector = 'a.result div.abstract p span.url';
        chai.expect(resultElement.querySelector(parentNewsDomainSelector)).to.exist;
        chai.expect(resultElement.querySelector(parentNewsDomainSelector))
        .to.have.text(results[0].snippet.extra.domain);
      });

      it('with existing and correct link', function () {
        const parentNewsLinkSelector = 'a.result';
        chai.expect(resultElement.querySelector(parentNewsLinkSelector).href).to.exist;
        chai.expect(resultElement.querySelector(parentNewsLinkSelector).href)
        .to.equal(results[0].url);
      });

      it('with existing and correct description', function () {
        const parentNewsDescriptionSelector = 'a.result div.abstract p span.description';
        chai.expect(resultElement.querySelector(parentNewsDescriptionSelector)).to.exist;
        chai.expect(resultElement.querySelector(parentNewsDescriptionSelector))
        .to.have.text(results[0].snippet.description);
      });

      it('with 3 children', function () {
        const parentNewsChildrenSelector = 'div.news a.result';
        chai.expect(resultElement.querySelectorAll(parentNewsChildrenSelector).length).to.equal(3);
      });
    });

    describe('renders all child news results', function () {
      it('successfully', function () {
        const childNewsSelector = 'div.news a.result';
        const childNewsItems = resultElement.querySelectorAll(childNewsSelector);
        [].forEach.call(childNewsItems, function (child) {
          chai.expect(child).to.exist;
        });
      });

      it('with existing and correct images', function () {
        const childImageSelector = 'div.news a.result div.abstract div.thumbnail img';
        const childrenImageItems = resultElement.querySelectorAll(childImageSelector);
        [].forEach.call(childrenImageItems, function (image, i) {
          chai.expect(image).to.exist;
          chai.expect(image.src).to.equal(results[0].snippet.deepResults[0].links[i].extra.media);
        });
      });

      it('with existing and correct titles', function () {
        const childTitleSelector = 'div.news a.result div.abstract span.title';
        const childrenTitleItems = resultElement.querySelectorAll(childTitleSelector);
        [].forEach.call(childrenTitleItems, function (title, i) {
          chai.expect(title).to.exist;
          chai.expect(title).to.have.text(results[0].snippet.deepResults[0].links[i].title);
        });
      });

      it('with existing and correct domains', function () {
        const childDomainSelector = 'div.news a.result div.abstract span.url';
        const childrenDomainItems = resultElement.querySelectorAll(childDomainSelector);
        [].forEach.call(childrenDomainItems, function (domain, i) {
          chai.expect(domain).to.exist;
          chai.expect(domain).to.have.text(results[0].snippet.deepResults[0].links[i].extra.domain);
        });
      });

      it('with existing and correct links', function () {
        const childLinkSelector = 'div.news a.result';
        const childrenLinkItems = resultElement.querySelectorAll(childLinkSelector);
        [].forEach.call(childrenLinkItems, function (link, i) {
          chai.expect(link.href).to.exist;
          chai.expect(link.href).to.equal(results[0].snippet.deepResults[0].links[i].url);
        });
      });

      it('with existing ages', function () {
        const childAgeSelector = 'div.news a.result div.abstract span.published-at';
        const childrenAgeItems = resultElement.querySelectorAll(childAgeSelector);
        [].forEach.call(childrenAgeItems, function (age) {
          chai.expect(age).to.exist;
        });
      });

      it('with existing and correct descriptions', function () {
        const childDescriptionSelector = 'div.news a.result div.abstract span.description';
        const childrenDescriptionItems = resultElement.querySelectorAll(childDescriptionSelector);
        [].forEach.call(childrenDescriptionItems, function (desc, i) {
          chai.expect(desc).to.exist;
          chai.expect(desc).to.have.text(results[0]
            .snippet.deepResults[0].links[i].extra.description);
        });
      });
    });

    describe('renders buttons', function () {
      it('successfully', function () {
        const buttonsAreaSelector = 'div.buttons';
        chai.expect(resultElement.querySelector(buttonsAreaSelector)).to.exist;
      });

      it('correct amount', function () {
        const buttonSelector = 'div.buttons a.btn';
        const amountOfButtons = results[0].snippet.deepResults[1].links.length;
        chai.expect(resultElement.querySelectorAll(buttonSelector).length)
          .to.equal(amountOfButtons);
      });

      it('with correct text', function () {
        const buttonSelector = 'div.buttons a.btn';
        const buttonsItems = resultElement.querySelectorAll(buttonSelector);
        [].forEach.call(buttonsItems, function (button, i) {
          chai.expect(button).to.contain.text(results[0].snippet.deepResults[1].links[i].title);
        });
      });

      it('with correct links', function () {
        const buttonSelector = 'div.buttons a.btn';
        const buttonsItems = resultElement.querySelectorAll(buttonSelector);
        [].forEach.call(buttonsItems, function (button, i) {
          chai.expect(button.href).to.contain(results[0].snippet.deepResults[1].links[i].url);
        });
      });
    });
  });
}
