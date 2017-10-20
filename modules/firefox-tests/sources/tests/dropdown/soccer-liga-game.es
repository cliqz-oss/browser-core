/* global it, expect, chai, respondWith, fillIn, waitForPopup,
  $cliqzResults, CliqzUtils, window */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

export default function () {
  context('for a soccer liga game results', function () {
    const results = [
      {
        url: 'http://www.fcbayern.de/',
        score: 6897,
        snippet: {
          deepResults: [
            {
              links: [
                {
                  title: 'Tickets',
                  url: 'https://fcbayern.com/de/tickets'
                },
                {
                  title: 'FC Bayern.tv',
                  url: 'https://fcbayern.com/fcbayerntv/de'
                },
                {
                  title: 'Profis',
                  url: 'https://fcbayern.com/de/teams/profis'
                },
                {
                  title: 'Termine',
                  url: 'https://fcbayern.com/de/termine'
                },
                {
                  title: 'News',
                  url: 'https://fcbayern.com/de/news'
                },
                {
                  title: 'Frauen',
                  url: 'https://fcbayern.com/de/teams/frauen'
                },
                {
                  title: 'Allianz Arena',
                  url: 'https://fcbayern.com/de/allianz-arena'
                },
                {
                  title: 'Club',
                  url: 'https://fcbayern.com/de/club'
                },
                {
                  title: 'Spiele',
                  url: 'https://fcbayern.com/de/spielplan'
                },
                {
                  title: 'Kidsclub',
                  url: 'https://fcbayern.com/kidsclub/de'
                },
                {
                  title: 'Junior Team',
                  url: 'https://fcbayern.com/de/teams/junior-team'
                },
                {
                  title: 'FCB AG',
                  url: 'https://fcbayern.com/de/club/fcb-ag'
                },
              ],
              type: 'buttons'
            },
            {
              links: [
                {
                  extra: {
                    creation_timestamp: 1505817395,
                    description: 'Die Anhänger des Rekordmeisters müssen laut einer Studie in dieser Saison den weitesten Weg zu den Auswärtsspielen zurücklegen - über 7000 Kilometer mehr als die der Eintracht.',
                    domain: 'sport1.de',
                    murl: 'http://m.sport1.de/fussball/bundesliga/2017/09/bundesliga-fans-von-bayern-muenchen-muessen-am-weitesten-reisen',
                    thumbnail: 'https://images.sport1.de/imagix/filter2/jpeg/_set=og_image,focus=51x62/imagix/970b076f-9d20-11e7-b3ce-f80f41fc6a62',
                    tweet_count: 1
                  },
                  title: 'Bundesliga: Fans von Bayern München müssen am weitesten reisen',
                  url: 'http://www.sport1.de/fussball/bundesliga/2017/09/bundesliga-fans-von-bayern-muenchen-muessen-am-weitesten-reisen'
                },
                {
                  extra: {
                    creation_timestamp: 1505853199,
                    description: 'James Rodriguez führt den FC Bayern München am 5. Spieltag bei Schalke 04 zu einem souveränen Sieg - und an die Spitze. Der Kolumbianer ist an allen Toren beteiligt.',
                    domain: 'sport1.de',
                    murl: 'http://m.sport1.de/fussball/bundesliga/2017/09/bundesliga-spielbericht-fc-schalke-04-fc-bayern-muenchen',
                    thumbnail: 'https://images.sport1.de/imagix/filter2/jpeg/_set=og_image,focus=60x41/imagix/52cbf04b-9d75-11e7-b3ce-f80f41fc6a62',
                    tweet_count: 2
                  },
                  title: 'Bundesliga-Spielbericht: FC Schalke 04 - FC Bayern München',
                  url: 'http://www.sport1.de/fussball/bundesliga/2017/09/bundesliga-spielbericht-fc-schalke-04-fc-bayern-muenchen'
                },
                {
                  extra: {
                    creation_timestamp: 1505817445,
                    description: 'Schock für den FC Bayern München: Keeper Manuel Neuer ist wegen eines Haarrisses im linken Fuß operiert worden. Er hatte sich beim Abschlusstraining vor der Partie auf Schalke erneut am Fuß verletzt.',
                    domain: 'spiegel.de',
                    murl: 'http://m.spiegel.de/sport/fussball/a-1168662.html',
                    thumbnail: 'http://cdn4.spiegel.de/images/image-1191337-galleryV9-vkfw-1191337.jpg',
                    tweet_count: 14
                  },
                  title: 'Bayern München: Nationaltorhüter Neuer fällt für Rest der Hinrunde aus',
                  url: 'http://www.spiegel.de/sport/fussball/manuel-neuer-nationaltorhueter-faellt-fuer-den-rest-der-hinrunde-aus-a-1168662.html'
                }
              ],
              type: 'news'
            }
          ],
          description: 'News, Videos, Bildergalerien, Teaminfos, Spielpläne, Termine, Tickets und vieles mehr vom deutschen Fußball-Rekordmeister.',
          extra: {
            GUESS: 'Bayern München',
            HOST: 'FC Schalke 04',
            club: 'Bayern München',
            finalScore: '0 : 3',
            gameDate: 'Dienstag, 19. September',
            gameId: '3827628',
            gameTime: '20:30',
            gameUtcTimestamp: 1505845800,
            guestId: '14',
            guestLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Bayern-Muenchen.png',
            halfTimeScore: '0 : 2',
            hostId: '2',
            hostLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/FC-Schalke-04.png',
            id: '3827628',
            isLive: false,
            isScheduled: false,
            last_updated_ago: 19.846940994262695,
            leagueId: '1',
            leagueLogo: 'https://cdn.cliqz.com/extension/bundesliga/leagues-bw/60x80/1.-Bundesliga.png',
            leagueName: '1. Bundesliga',
            live_url: 'http://www.kicker.de/news/fussball/bundesliga/spieltag/1-bundesliga/2017-18/5/3827628/spielbericht_fc-schalke-04-2_bayern-muenchen-14.html',
            location: 'Veltins-Arena',
            matches: [
              {
                GUESS: 'Bayern München',
                HOST: 'FC Schalke 04',
                club: 'Bayern München',
                finalScore: '0 : 3',
                gameDate: 'Dienstag, 19. September',
                gameId: '3827628',
                gameTime: '20:30',
                gameUtcTimestamp: 1505845800,
                guestId: '14',
                guestLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Bayern-Muenchen.png',
                halfTimeScore: '0 : 2',
                hostId: '2',
                hostLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/FC-Schalke-04.png',
                id: '3827628',
                isLive: false,
                isScheduled: false,
                leagueId: '1',
                leagueLogo: 'https://cdn.cliqz.com/extension/bundesliga/leagues-bw/60x80/1.-Bundesliga.png',
                leagueName: '1. Bundesliga',
                live_url: 'http://www.kicker.de/news/fussball/bundesliga/spieltag/1-bundesliga/2017-18/5/3827628/spielbericht_fc-schalke-04-2_bayern-muenchen-14.html',
                location: 'Veltins-Arena',
                scored: '0 : 3',
                spielTag: '5. Spieltag',
                status: 'FINISHED',
                teamId: '14'
              },
              {
                GUESS: 'VfL Wolfsburg',
                HOST: 'Bayern München',
                club: 'Bayern München',
                finalScore: '',
                gameDate: 'Freitag, 22. September',
                gameId: '3827633',
                gameTime: '20:30',
                gameUtcTimestamp: 1506105000,
                guestId: '24',
                guestLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/VfL-Wolfsburg.png',
                halfTimeScore: '',
                hostId: '14',
                hostLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Bayern-Muenchen.png',
                id: '3827633',
                isLive: false,
                isScheduled: true,
                leagueId: '1',
                leagueLogo: 'https://cdn.cliqz.com/extension/bundesliga/leagues-bw/60x80/1.-Bundesliga.png',
                leagueName: '1. Bundesliga',
                live_url: 'http://www.kicker.de/news/fussball/bundesliga/spieltag/1-bundesliga/2017-18/6/3827633/spielinfo_bayern-muenchen-14_vfl-wolfsburg-24.html',
                location: 'Allianz-Arena',
                scored: '- : -',
                spielTag: '6. Spieltag',
                status: 'SCHEDULED',
                teamId: '14'
              },
            ],
            scored: '0 : 3',
            spielTag: '5. Spieltag',
            status: 'FINISHED',
            teamId: '14',
            title: 'Bayern München Spieltag - Spielplan - Ergebnisse',
            url: 'http://www.kicker.de/news/fussball/bundesliga/vereine/1-bundesliga/2017-18/bayern-muenchen-14/vereinsinformationen.html'
          },
          friendlyUrl: 'fcbayern.de',
          title: 'Home - FC Bayern München'
        },
        c_url: 'http://www.fcbayern.de/',
        type: 'rh',
        subType: {
          class: 'SoccerEZ',
          id: '-1137546720134457117',
          name: 'TEAM: Bayern München'
        },
        template: 'ligaEZ1Game',
        trigger: [
          'fcbayern.de'
        ],
        trigger_method: 'url'
      },

    ];
    const locale = CliqzUtils.locale.default || CliqzUtils.locale[window.navigator.language];
    let resultElement;

    before(function () {
      respondWith({ results });
      fillIn('fc bayern');
      return waitForPopup().then(function () {
        resultElement = $cliqzResults()[0];
      });
    });

    describe('renders a parent soccer result', function () {
      const parentSoccerSelector = 'a.result:not(.search)';

      it('successfully', function () {
        chai.expect(resultElement.querySelector(parentSoccerSelector)).to.exist;
      });

      it('with an existing and correct title', function () {
        const parentSoccerTitleSelector = 'a.result:not(.search) div.abstract p span.title';
        const parentSoccerTitleItem = resultElement.querySelector(parentSoccerTitleSelector);
        chai.expect(parentSoccerTitleItem).to.exist;
        chai.expect(parentSoccerTitleItem).to.have.text(results[0].snippet.title);
      });

      it('with an existing and correct domain', function () {
        const parentSoccerDomainSelector = 'a.result:not(.search) div.abstract p span.url';
        const parentSoccerDomainItem = resultElement.querySelector(parentSoccerDomainSelector);
        chai.expect(parentSoccerDomainItem).to.exist;
        chai.expect(parentSoccerDomainItem).to.have.text(results[0].snippet.friendlyUrl);
      });

      it('with an existing and correct link', function () {
        const parentSoccerLinkItem = resultElement.querySelector(parentSoccerSelector).href;
        chai.expect(parentSoccerLinkItem).to.exist;
        chai.expect(parentSoccerLinkItem).to.equal(results[0].url);
      });

      it('with an existing and correct description', function () {
        const parentSoccerDescSelector = 'a.result:not(.search) div.abstract p span.description';
        const parentSoccerDescItem = resultElement.querySelector(parentSoccerDescSelector);
        chai.expect(parentSoccerDescItem).to.exist;
        chai.expect(parentSoccerDescItem).to.have.text(results[0].snippet.description);
      });

      it('with existing and correct buttons', function () {
        const parentButtonSelector = 'div.buttons a.btn';
        const parentButtonItems = resultElement.querySelectorAll(parentButtonSelector);

        chai.expect(parentButtonItems.length).to.equal(4);
        [...parentButtonItems].forEach(function (button, i) {
          chai.expect(button).to.exist;
          chai.expect(button)
            .to.contain.text(results[0].snippet.deepResults[0].links[i].title);
          chai.expect(button.href)
            .to.contain(results[0].snippet.deepResults[0].links[i].url);
        });
      });
    });

    describe('renders a results table', function () {
      const soccerTableRowSelector = 'div.soccer a.table-row.result';
      const win = CliqzUtils.getWindow();

      let soccerTableRowItem;

      beforeEach(function () {
        soccerTableRowItem = resultElement.querySelectorAll(soccerTableRowSelector);
      });

      context('with a title', function () {
        it('existing and correct', function () {
          const soccerTitleSelector = 'a.soccer-title span.padded';
          const soccerTitleItem = resultElement.querySelector(soccerTitleSelector);
          chai.expect(soccerTitleItem).to.exist;
          chai.expect(soccerTitleItem).to.have.text(results[0].snippet.extra.title);
        });

        it('with correct URL', function () {
          const soccerTitleLinkSelector = 'a.soccer-title';
          const soccerTitleLinkItem = resultElement.querySelector(soccerTitleLinkSelector);
          chai.expect(soccerTitleLinkItem.href).to.equal(results[0].snippet.extra.url);
        });

        it('with a correct domain', function () {
          const soccerTitleDomainSelector = 'a.soccer-title span.soccer-domain:not(.divider)';
          const soccerTitleDomainItem = resultElement.querySelector(soccerTitleDomainSelector);
          chai.expect(soccerTitleDomainItem).to.have.text('kicker.de');
        });
      });

      it('successfully', function () {
        const soccerTableSelector = 'div.soccer';
        const soccerTableItem = resultElement.querySelector(soccerTableSelector);
        chai.expect(soccerTableItem).to.exist;
      });

      it('with details of two matches', function () {
        chai.expect(soccerTableRowItem.length).to.equal(2);
      });

      it('with an existing and correct "Show more" being a link', function () {
        const soccerShowMoreSelector = 'div.soccer a.expand-btn';
        const soccerShowMoreItem = resultElement.querySelector(soccerShowMoreSelector);
        const showMore = locale['soccer-expand-button'].message;
        chai.expect(soccerShowMoreItem).to.exist;
        chai.expect(soccerShowMoreItem.href).to.exist;
        chai.expect(soccerShowMoreItem).to.contain.text(showMore);
      });

      it('with an existing and correct "Powered by" caption', function () {
        const soccerCaptionSelector = 'div.soccer a.powered-by';
        const soccerCaptionItem = resultElement.querySelector(soccerCaptionSelector);
        const poweredBy = locale['soccer-powered-by'].message;
        chai.expect(soccerCaptionItem).to.exist;
        chai.expect(soccerCaptionItem).to.contain.text(poweredBy);
      });

      context('each match row', function () {
        it('has an existing and correct URL', function () {
          [...soccerTableRowItem].forEach(function (row, i) {
            chai.expect(row.href).to.exist;
            chai.expect(row.href)
              .to.equal(results[0].snippet.extra.matches[i].live_url);
          });
        });

        it('has existing and correct names of two teams', function () {
          const soccerTeamSelector = 'div.fixed-width';

          [...soccerTableRowItem].forEach(function (row, i) {
            const soccerTeamItem = row.querySelectorAll(soccerTeamSelector);
            chai.expect(soccerTeamItem.length).to.equal(2);
            chai.expect(soccerTeamItem[0]).to.have.text(results[0].snippet.extra.matches[i].HOST);
            chai.expect(soccerTeamItem[1]).to.have.text(results[0].snippet.extra.matches[i].GUESS);
          });
        });

        it('has logos of two teams', function () {
          const soccerTeamLogoSelector = 'div.club-logo div';

          [...soccerTableRowItem].forEach(function (row, i) {
            const soccerTeamLogoItem = row.querySelectorAll(soccerTeamLogoSelector);
            chai.expect(soccerTeamLogoItem.length).to.equal(2);

            chai.expect(win.getComputedStyle(row
              .querySelectorAll(soccerTeamLogoSelector)[0]).backgroundImage)
              .to.contain(results[0].snippet.extra.matches[i].hostLogo);

            chai.expect(win.getComputedStyle(row
              .querySelectorAll(soccerTeamLogoSelector)[1]).backgroundImage)
              .to.contain(results[0].snippet.extra.matches[i].guestLogo);
          });
        });

        it('has a result with existing and correct two numbers', function () {
          const soccerResultSelector = 'div.scored';

          [...soccerTableRowItem].forEach(function (row, i) {
            const soccerResultItem = row.querySelector(soccerResultSelector);
            chai.expect(soccerResultItem)
              .to.contain.text(results[0].snippet.extra.matches[i].scored);
          });
        });

        it('has an existing date and time', function () {
          const soccerDateSelector = 'div.time';

          [...soccerTableRowItem].forEach(function (row) {
            const soccerDateItem = row.querySelector(soccerDateSelector);
            chai.expect(soccerDateItem).to.exist;
          });
        });

        it('has an existing and correct league logo', function () {
          const soccerLeagueLogoSelector = 'div.league-logo';

          [...soccerTableRowItem].forEach(function (row, i) {
            const soccerLeagueLogoItem = row.querySelector(soccerLeagueLogoSelector);
            chai.expect(soccerLeagueLogoItem).to.exist;
            chai.expect(win.getComputedStyle(row
              .querySelector(soccerLeagueLogoSelector)).backgroundImage)
              .to.contain(results[0].snippet.extra.matches[i].leagueLogo);
          });
        });
      });
    });

    describe('renders a news area', function () {
      const soccerNewsElementSelector = 'div.news a.result';
      let soccerNewsElementItems;

      beforeEach(function () {
        soccerNewsElementItems = resultElement.querySelectorAll(soccerNewsElementSelector);
      });

      it('successfully', function () {
        const soccerNewsSelector = 'div.padded:not(.soccer)';
        const soccerNewsItem = resultElement.querySelector(soccerNewsSelector);
        chai.expect(soccerNewsItem).to.exist;
      });

      it('with an existing and correct header', function () {
        const soccerNewsHeaderSelector = 'p.news-injection-title';
        const soccerNewsHeader = resultElement.querySelector(soccerNewsHeaderSelector);
        const newsHeader = locale['soccer-news-title'].message;
        chai.expect(soccerNewsHeader).to.exist;
        chai.expect(soccerNewsHeader).to.have.text(newsHeader);
      });

      it('with two news items', function () {
        chai.expect(soccerNewsElementItems.length).to.equal(2);
      });

      context('each news item', function () {
        it('has an existing and correct thumbnail', function () {
          [...soccerNewsElementItems].forEach(function (element, i) {
            const soccerNewsThumbnailItem = element.querySelector('div.thumbnail img');
            chai.expect(soccerNewsThumbnailItem).to.exist;
            chai.expect(soccerNewsThumbnailItem.src)
              .to.equal(results[0].snippet.deepResults[1].links[i].extra.thumbnail);
          });
        });

        it('has an existing and correct title', function () {
          [...soccerNewsElementItems].forEach(function (element, i) {
            const soccerNewsTitleItem = element.querySelector('div.content span.title');
            chai.expect(soccerNewsTitleItem).to.exist;
            chai.expect(soccerNewsTitleItem)
              .to.have.text(results[0].snippet.deepResults[1].links[i].title);
          });
        });

        it('has an existing and correct domain', function () {
          [...soccerNewsElementItems].forEach(function (element, i) {
            const soccerNewsDomainItem = element.querySelector('div.content span.url');
            chai.expect(soccerNewsDomainItem).to.exist;
            chai.expect(soccerNewsDomainItem)
              .to.have.text(results[0].snippet.deepResults[1].links[i].extra.domain);
          });
        });

        it('has an existing timestamp', function () {
          [...soccerNewsElementItems].forEach(function (element) {
            const soccerNewsTimestampItem = element.querySelector('div.content span.published-at');
            chai.expect(soccerNewsTimestampItem).to.exist;
          });
        });

        it('has an existing and correct URL', function () {
          [...soccerNewsElementItems].forEach(function (element, i) {
            chai.expect(element.href).to.exist;
            chai.expect(element.href)
              .to.equal(results[0].snippet.deepResults[1].links[i].url);
          });
        });
      });
    });
  });
}
