/* global it, expect, chai, respondWith, fillIn, waitForPopup,
  $cliqzResults, CliqzUtils, window */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

export default function () {
  context('for a soccer liga table results', function () {
    const results = [
      {
        url: 'http://www.bundesliga.de/de/liga/tabelle',
        score: 9848,
        snippet: {
          description: 'Die aktuelle Tabelle der Bundesliga mit allen Informationen zu Punkten, Tore, Heimbilanz, Auswärtsbilanz, Form',
          extra: {
            info_list: {
              N: 'Verloren',
              PKT: 'Punkte',
              S: 'Siege',
              SP: 'Spiele',
              TD: 'Tordiff',
              U: 'Remis',
              club: 'Mannschaft',
              goals: 'Tore +:-',
              qualified: 'Qualifiziert',
              rank: 'Platz'
            },
            leagueId: '1',
            leagueName: '1. Bundesliga',
            ranking: [
              {
                GT: 0,
                N: 0,
                PKT: 13,
                S: 4,
                SP: 5,
                T: 13,
                TD: 13,
                U: 1,
                club: 'Borussia Dortmund',
                goals: '13:0',
                logo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Borussia-Dortmund.png',
                qualified: 'Champions League',
                rank: 1
              },
              {
                GT: 3,
                N: 1,
                PKT: 12,
                S: 4,
                SP: 5,
                T: 12,
                TD: 9,
                U: 0,
                club: 'Bayern München',
                goals: '12:3',
                logo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Bayern-Muenchen.png',
                qualified: 'Champions League',
                rank: 2
              },
              {
                GT: 5,
                N: 0,
                PKT: 11,
                S: 3,
                SP: 5,
                T: 9,
                TD: 4,
                U: 2,
                club: 'TSG Hoffenheim',
                goals: '9:5',
                logo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/TSG-Hoffenheim.png',
                qualified: 'Champions League',
                rank: 3
              },
              {
                GT: 2,
                N: 0,
                PKT: 11,
                S: 3,
                SP: 5,
                T: 6,
                TD: 4,
                U: 2,
                club: 'Hannover 96',
                goals: '6:2',
                logo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Hannover-96.png',
                qualified: 'Champions League',
                rank: 4
              },
              {
                GT: 4,
                N: 1,
                PKT: 10,
                S: 3,
                SP: 5,
                T: 8,
                TD: 4,
                U: 1,
                club: 'FC Augsburg',
                goals: '8:4',
                logo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/FC-Augsburg.png',
                qualified: 'Champions League',
                rank: 5
              },
              {
                GT: 6,
                N: 2,
                PKT: 9,
                S: 3,
                SP: 5,
                T: 7,
                TD: 1,
                U: 0,
                club: 'FC Schalke 04',
                goals: '7:6',
                logo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/FC-Schalke-04.png',
                qualified: 'Champions League',
                rank: 6
              },
              {
                GT: 5,
                N: 1,
                PKT: 8,
                S: 2,
                SP: 5,
                T: 7,
                TD: 2,
                U: 2,
                club: 'Bor. Mönchengladbach',
                goals: '7:5',
                logo: 'https://cdn.cliqz.com/extension/bundesliga/teams/60x60/Bor-Moenchengladbach.png',
                qualified: 'Champions League',
                rank: 7
              },
            ],
            result_type: {
              league_table: true
            },
            title: '1. Bundesliga Tabelle',
            url: 'http://www.kicker.de/news/fussball/bundesliga/spieltag/1-bundesliga/2017-18/spieltag.html'
          },
          friendlyUrl: 'bundesliga.de/de/liga/tabelle',
          title: 'Bundesliga | Tabelle | Spieltag 1 | Saison 2016/2017'
        },
        c_url: 'http://www.bundesliga.de/de/liga/tabelle',
        type: 'rh',
        subType: {
          class: 'SoccerEZ',
          id: '184384238616031931',
          name: 'TABLE: 1. Bundesliga'
        },
        template: 'ligaEZTable',
        trigger: [
          'bundesliga.de/de/liga/tabelle'
        ],
        trigger_method: 'url'
      },
    ];
    const locale = CliqzUtils.locale.default || CliqzUtils.locale[window.navigator.language];
    let resultElement;

    before(function () {
      respondWith({ results });
      fillIn('bundesliga tabelle');
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
      const soccerTableRowSelector = 'div.soccer div.table div.table-row';
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

      it('with details of six matches', function () {
        chai.expect(soccerTableRowItem.length).to.equal(6);
      });

      describe('with table header area', function () {
        const soccerTableHeaderSelector = 'div.soccer div.table-header div.table-cell';
        let soccerTableHeaderItem;

        beforeEach(function () {
          soccerTableHeaderItem = resultElement.querySelectorAll(soccerTableHeaderSelector);
        });

        it('with correct amount of columns', function () {
          chai.expect(soccerTableHeaderItem.length).to.equal(10);
        });

        it('with correct text in each header', function () {
          chai.expect(soccerTableHeaderItem[0])
            .to.have.text(results[0].snippet.extra.info_list.rank);
          /* Column #1 has no header */
          chai.expect(soccerTableHeaderItem[2])
            .to.have.text(results[0].snippet.extra.info_list.club);
          chai.expect(soccerTableHeaderItem[3])
            .to.have.text(results[0].snippet.extra.info_list.SP);
          chai.expect(soccerTableHeaderItem[4])
            .to.have.text(results[0].snippet.extra.info_list.S);
          chai.expect(soccerTableHeaderItem[5])
            .to.have.text(results[0].snippet.extra.info_list.N);
          chai.expect(soccerTableHeaderItem[6])
            .to.have.text(results[0].snippet.extra.info_list.U);
          chai.expect(soccerTableHeaderItem[7])
            .to.have.text(results[0].snippet.extra.info_list.goals);
          chai.expect(soccerTableHeaderItem[8])
            .to.have.text(results[0].snippet.extra.info_list.TD);
          chai.expect(soccerTableHeaderItem[9])
            .to.have.text(results[0].snippet.extra.info_list.PKT);
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

      /* TODO */
      context('each table row', function () {
        const win = CliqzUtils.getWindow();
        const soccerTableCellSelector = 'div.table-cell';
        let soccerTableCellItem;

        it('has an existing and correct index', function () {
          [...soccerTableRowItem].forEach(function (row, i) {
            soccerTableCellItem = row.querySelectorAll(soccerTableCellSelector);
            chai.expect(soccerTableCellItem[0]).to.have.text(`${i + 1}`);
          });
        });

        it('has an existing and correct team logo', function () {
          [...soccerTableRowItem].forEach(function (row, i) {
            chai.expect(win.getComputedStyle(row
              .querySelector('div.club-logo div')).backgroundImage)
              .to.contain(results[0].snippet.extra.ranking[i].logo);
          });
        });

        it('has an existing and correct team name', function () {
          [...soccerTableRowItem].forEach(function (row, i) {
            chai.expect(row.querySelectorAll(soccerTableCellSelector)[2])
              .to.have.text(results[0].snippet.extra.ranking[i].club);
          });
        });

        it('has an existing and correct amount of matches', function () {
          [...soccerTableRowItem].forEach(function (row, i) {
            chai.expect(row.querySelectorAll(soccerTableCellSelector)[3])
              .to.have.text(results[0].snippet.extra.ranking[i].SP.toString());
          });
        });

        it('has an existing and correct amount of victories', function () {
          [...soccerTableRowItem].forEach(function (row, i) {
            chai.expect(row.querySelectorAll(soccerTableCellSelector)[4])
              .to.have.text(results[0].snippet.extra.ranking[i].S.toString());
          });
        });

        it('has an existing and correct amount of loses', function () {
          [...soccerTableRowItem].forEach(function (row, i) {
            chai.expect(row.querySelectorAll(soccerTableCellSelector)[5])
              .to.have.text(results[0].snippet.extra.ranking[i].N.toString());
          });
        });

        it('has an existing and correct amount of ties', function () {
          [...soccerTableRowItem].forEach(function (row, i) {
            chai.expect(row.querySelectorAll(soccerTableCellSelector)[6])
              .to.have.text(results[0].snippet.extra.ranking[i].U.toString());
          });
        });

        it('has an existing and correct amount of goals', function () {
          [...soccerTableRowItem].forEach(function (row, i) {
            chai.expect(row.querySelectorAll(soccerTableCellSelector)[7])
              .to.have.text(results[0].snippet.extra.ranking[i].goals);
          });
        });

        it('has an existing and correct difference of goals', function () {
          [...soccerTableRowItem].forEach(function (row, i) {
            chai.expect(row.querySelectorAll(soccerTableCellSelector)[8])
              .to.have.text(results[0].snippet.extra.ranking[i].TD.toString());
          });
        });

        it('has an existing and correct amount of points', function () {
          [...soccerTableRowItem].forEach(function (row, i) {
            chai.expect(row.querySelectorAll(soccerTableCellSelector)[9])
              .to.have.text(results[0].snippet.extra.ranking[i].PKT.toString());
          });
        });
      });
    });
  });
}
