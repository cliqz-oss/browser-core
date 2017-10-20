/* global it, expect, chai, respondWith, fillIn, waitForPopup,
$cliqzResults, CliqzUtils, window */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

export default function () {
  context('for a soccer live ticker results', function () {
    const results = [
      {
        url: 'http://liveticker.bundesliga.de/',
        score: 1117,
        snippet: {
          description: 'Alle Spiele, alle Tore, offizielle Spieldaten, aktuelle Statistiken und Spielverläufe, Liga-Radio, Blitztabelle und Torjäger im Liveticker von bundesliga.de.',
          extra: {
            spielTag: '5. Spieltag',
            title: '1. Bundesliga Spieltag - Spielplan - Ergebnisse',
            url: 'http://www.kicker.de/news/fussball/bundesliga/spieltag/1-bundesliga/livekonferenz.html',
            weeks: [
              {
                isCurrent: false,
                matches: [],
                round: 'Spieltag 3',
                spielTag: '3. Spieltag'
              },
              {
                isCurrent: false,
                matches: [],
                round: 'Spieltag 4',
                spielTag: '4. Spieltag'
              },
              {
                isCurrent: true,
                matches: [
                  {
                    GUESS: 'VfB Stuttgart',
                    HOST: 'Bor. Mönchengladbach',
                    club: null,
                    finalScore: '2 : 0',
                    gameDate: 'Dienstag, 19. August',
                    gameId: '3827627',
                    gameTime: '18:30',
                    gameUtcTimestamp: 1505838600,
                    guestId: '11',
                    guestLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/VfB-Stuttgart.png',
                    halfTimeScore: '0 : 0',
                    hostId: '15',
                    hostLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Bor-Moenchengladbach.png',
                    id: '3827627',
                    isLive: false,
                    isScheduled: false,
                    leagueId: '1',
                    leagueLogo: 'https://cdn.cliqz.com/extension/bundesliga/leagues-bw/60x80/1.-Bundesliga.png',
                    leagueName: '1. Bundesliga',
                    live_url: 'http://www.kicker.de/news/fussball/bundesliga/spieltag/1-bundesliga/2017-18/5/3827627/spielbericht_borussia-mgladbach-15_vfb-stuttgart-11.html',
                    location: 'Borussia-Park',
                    scored: '2 : 0',
                    spielTag: '5. Spieltag',
                    status: 'FINISHED',
                    teamId: ''
                  },
                  {
                    GUESS: 'Werder Bremen',
                    HOST: 'VfL Wolfsburg',
                    club: null,
                    finalScore: '1 : 1',
                    gameDate: 'Dienstag, 19. August',
                    gameId: '3827632',
                    gameTime: '20:30',
                    gameUtcTimestamp: 1505845800,
                    guestId: '4',
                    guestLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Werder-Bremen.png',
                    halfTimeScore: '1 : 0',
                    hostId: '24',
                    hostLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/VfL-Wolfsburg.png',
                    id: '3827632',
                    isLive: false,
                    isScheduled: false,
                    leagueId: '1',
                    leagueLogo: 'https://cdn.cliqz.com/extension/bundesliga/leagues-bw/60x80/1.-Bundesliga.png',
                    leagueName: '1. Bundesliga',
                    live_url: 'http://www.kicker.de/news/fussball/bundesliga/spieltag/1-bundesliga/2017-18/5/3827632/spielbericht_vfl-wolfsburg-24_werder-bremen-4.html',
                    location: 'Volkswagen-Arena',
                    scored: '1 : 1',
                    spielTag: '5. Spieltag',
                    status: 'FINISHED',
                    teamId: ''
                  },
                  {
                    GUESS: 'RB Leipzig',
                    HOST: 'FC Augsburg',
                    club: null,
                    finalScore: '1 : 0',
                    gameDate: 'Dienstag, 19. August',
                    gameId: '3827629',
                    gameTime: '20:30',
                    gameUtcTimestamp: 1505845800,
                    guestId: '15778',
                    guestLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/RB-Leipzig.png',
                    halfTimeScore: '1 : 0',
                    hostId: '91',
                    hostLogo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/FC-Augsburg.png',
                    id: '3827629',
                    isLive: false,
                    isScheduled: false,
                    leagueId: '1',
                    leagueLogo: 'https://cdn.cliqz.com/extension/bundesliga/leagues-bw/60x80/1.-Bundesliga.png',
                    leagueName: '1. Bundesliga',
                    live_url: 'http://www.kicker.de/news/fussball/bundesliga/spieltag/1-bundesliga/2017-18/5/3827629/spielbericht_fc-augsburg-91_rasenballsport-leipzig-15778.html',
                    location: 'WWK-Arena',
                    scored: '1 : 0',
                    spielTag: '5. Spieltag',
                    status: 'FINISHED',
                    teamId: ''
                  },
                ],
                round: 'Spieltag 5',
                spielTag: '5. Spieltag'
              },
              {
                isCurrent: false,
                matches: [],
                round: 'Spieltag 6',
                spielTag: '6. Spieltag'
              },
              {
                isCurrent: false,
                matches: [],
                round: 'Spieltag 7',
                spielTag: '7. Spieltag'
              }
            ]
          },
          friendlyUrl: 'liveticker.bundesliga.de',
          title: 'bundesliga.de | Liveticker Bundesliga |'
        },
        c_url: 'http://liveticker.bundesliga.de/',
        type: 'rh',
        subType: {
          class: 'SoccerEZ',
          id: '-8768299853491462719',
          name: 'LIVETICKER: 1. Bundesliga'
        },
        template: 'liveTicker',
        trigger: [
          'liveticker.bundesliga.de'
        ],
        trigger_method: 'url'
      },
    ];
    const locale = CliqzUtils.locale.default || CliqzUtils.locale[window.navigator.language];
    let resultElement;

    before(function () {
      respondWith({ results });
      fillIn('liveticker bundesliga');
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

        it('with a correct URL', function () {
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

      describe('with tabs area', function () {
        const soccerTabsSelector = 'div.soccer label.dropdown-tab-label';
        let soccerTabsItems;

        beforeEach(function () {
          soccerTabsItems = resultElement.querySelectorAll(soccerTabsSelector);
        });

        it('with correct amount of tabs', function () {
          chai.expect(soccerTabsItems.length).to.equal(5);
        });

        it('with correct text in each tab', function () {
          [...soccerTabsItems].forEach(function (tab, i) {
            chai.expect(tab).to.have.text(results[0].snippet.extra.weeks[i].round);
          });
        });
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
            .to.equal(results[0].snippet.extra.weeks[2].matches[i].live_url);
          });
        });

        it('has existing and correct names of two teams', function () {
          const soccerTeamSelector = 'div.fixed-width';

          [...soccerTableRowItem].forEach(function (row, i) {
            const soccerTeamItem = row.querySelectorAll(soccerTeamSelector);
            chai.expect(soccerTeamItem.length).to.equal(2);
            chai.expect(soccerTeamItem[0])
              .to.have.text(results[0].snippet.extra.weeks[2].matches[i].HOST);
            chai.expect(soccerTeamItem[1])
              .to.have.text(results[0].snippet.extra.weeks[2].matches[i].GUESS);
          });
        });

        it('has logos of two teams', function () {
          const soccerTeamLogoSelector = 'div.club-logo div';

          [...soccerTableRowItem].forEach(function (row, i) {
            const soccerTeamLogoItem = row.querySelectorAll(soccerTeamLogoSelector);
            chai.expect(soccerTeamLogoItem.length).to.equal(2);

            chai.expect(win.getComputedStyle(row
              .querySelectorAll(soccerTeamLogoSelector)[0]).backgroundImage)
              .to.contain(results[0].snippet.extra.weeks[2].matches[i].hostLogo);

            chai.expect(win.getComputedStyle(row
              .querySelectorAll(soccerTeamLogoSelector)[1]).backgroundImage)
              .to.contain(results[0].snippet.extra.weeks[2].matches[i].guestLogo);
          });
        });

        it('has a result with existing and correct two numbers', function () {
          const soccerResultSelector = 'div.scored';

          [...soccerTableRowItem].forEach(function (row, i) {
            const soccerResultItem = row.querySelector(soccerResultSelector);
            chai.expect(soccerResultItem)
            .to.contain.text(results[0].snippet.extra.weeks[2].matches[i].scored);
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
              .to.contain(results[0].snippet.extra.weeks[2].matches[i].leagueLogo);
          });
        });
      });
    });
  });
}
