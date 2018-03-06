/* global window */

import {
  $cliqzResults,
  click,
  CliqzUtils,
  expect,
  fillIn,
  getComputedStyle,
  respondWith,
  waitFor,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsSoccerLiveTicker';

export default function () {
  context('for soccer live ticker results', function () {
    const locale = CliqzUtils.locale.default || CliqzUtils.locale[window.navigator.language];
    let $resultElement;

    before(function () {
      withHistory([]);
      respondWith({ results });
      fillIn('liveticker bundesliga');
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults().find(`a.result[data-url='${results[0].url}']`)[0].parentNode;
      });
    });

    describe('renders parent element', function () {
      const soccerParentSelector = 'a.result';
      let $soccerParent;

      before(function () {
        $soccerParent = $resultElement.querySelector(soccerParentSelector);
      });

      it('successfully', function () {
        expect($soccerParent).to.exist;
      });

      it('with an existing and correct title', function () {
        const soccerParentTitleSelector = '.abstract .title';
        const $soccerParentTitle = $soccerParent.querySelector(soccerParentTitleSelector);
        expect($soccerParentTitle).to.exist;
        expect($soccerParentTitle).to.have.text(results[0].snippet.title);
      });

      it('with an existing and correct domain', function () {
        const soccerParentUrlSelector = '.abstract .url';
        const $soccerParentUrl = $soccerParent.querySelector(soccerParentUrlSelector);
        expect($soccerParentUrl).to.exist;
        expect($soccerParentUrl).to.contain.text(results[0].snippet.friendlyUrl);
      });

      it('with an existing logo', function () {
        const soccerParentLogoSelector = '.icons .logo';
        const $soccerParentLogo = $soccerParent.querySelector(soccerParentLogoSelector);
        expect($soccerParentLogo).to.exist;
      });

      it('with correct link', function () {
        expect($soccerParent.dataset.url).to.equal(results[0].url);
      });

      it('with an existing and correct description', function () {
        const soccerParentDescSelector = '.abstract .description';
        const $soccerParentDesc = $soccerParent.querySelector(soccerParentDescSelector);
        expect($soccerParentDesc).to.exist;
        expect($soccerParentDesc).to.have.text(results[0].snippet.description);
      });
    });

    describe('renders a table header', function () {
      const soccerTableHeaderSelector = 'a.soccer-title';
      let $soccerTableHeader;

      before(function () {
        $soccerTableHeader = $resultElement.querySelector(soccerTableHeaderSelector);
      });

      it('successfully', function () {
        expect($soccerTableHeader).to.exist;
      });


      it('with correct text', function () {
        const soccerTitleSelector = '.padded';
        const $soccerTitle = $soccerTableHeader.querySelector(soccerTitleSelector);
        expect($soccerTitle).to.exist;
        expect($soccerTitle).to.have.text(results[0].snippet.extra.title);
      });

      it('with correct URL', function () {
        expect($soccerTableHeader.dataset.url).to.exist;
        expect($soccerTableHeader.dataset.url).to.equal(results[0].snippet.extra.url);
      });

      it('with correct domain', function () {
        const soccerTitleDomainSelector = '.soccer-domain:not(.divider)';
        const $soccerTitleDomain = $soccerTableHeader
          .querySelector(soccerTitleDomainSelector);
        expect($soccerTitleDomain).to.have.text('kicker.de');
      });
    });

    describe('renders a results table', function () {
      const soccerTableArea = '.soccer';
      const soccerRowSelector = 'a.table-row';
      let $soccerTable;
      let $soccerRow;

      before(function () {
        $soccerTable = $resultElement.querySelector(soccerTableArea);
        $soccerRow = $soccerTable.querySelectorAll(soccerRowSelector);
      });

      it('successfully', function () {
        expect($soccerTable).to.exist;
      });

      it('with details of two matches', function () {
        expect($soccerRow.length).to.equal(2);
      });

      describe('with tabs area', function () {
        const soccerTabsSelector = '.dropdown-tab-label';
        let $soccerTabs;

        before(function () {
          $soccerTabs = $soccerTable.querySelectorAll(soccerTabsSelector);
        });

        it('with correct amount of tabs', function () {
          expect($soccerTabs.length).to.equal(5);
        });

        it('with correct text in each tab', function () {
          if ($soccerTabs.length > 0) {
            [...$soccerTabs].forEach(function (tab, i) {
              expect(tab).to.have.text(results[0].snippet.extra.weeks[i].round);
            });
          } else {
            throw new Error('Soccer results have not been generated.');
          }
        });
      });

      it('with an existing and correct "Show more" being link', function () {
        const soccerShowMoreSelector = 'a.expand-btn';
        const $soccerShowMore = $soccerTable.querySelector(soccerShowMoreSelector);
        const showMore = locale['soccer-expand-button'].message;
        expect($soccerShowMore).to.exist;
        expect($soccerShowMore.dataset.url).to.exist;
        expect($soccerShowMore).to.contain.text(showMore);
      });

      it('with an existing and correct "Powered by" caption', function () {
        const soccerCaptionSelector = 'a.powered-by';
        const $soccerCaption = $soccerTable.querySelector(soccerCaptionSelector);
        const poweredBy = locale['soccer-powered-by'].message;
        expect($soccerCaption).to.exist;
        expect($soccerCaption).to.contain.text(poweredBy);
      });

      describe('each match row', function () {
        it('has an existing and correct URL', function () {
          expect($soccerRow.length).to.be.above(0);
          [...$soccerRow].forEach(function (row, i) {
            expect(row.dataset.url).to.exist;
            expect(row.dataset.url)
              .to.equal(results[0].snippet.extra.weeks[2].matches[i].live_url);
          });
        });

        it('has existing and correct names of two teams', function () {
          const soccerTeamSelector = '.fixed-width';

          expect($soccerRow.length).to.be.above(0);
          [...$soccerRow].forEach(function (row, i) {
            const $soccerTeam = row.querySelectorAll(soccerTeamSelector);
            expect($soccerTeam.length).to.equal(2);
            expect($soccerTeam[0])
              .to.have.text(results[0].snippet.extra.weeks[2].matches[i].HOST);
            expect($soccerTeam[1])
              .to.have.text(results[0].snippet.extra.weeks[2].matches[i].GUESS);
          });
        });

        it('has logos of two teams', function () {
          const soccerTeamLogoSelector = '.club-logo div';

          expect($soccerRow.length).to.be.above(0);
          [...$soccerRow].forEach(function (row, i) {
            const $soccerTeamLogo = row.querySelectorAll(soccerTeamLogoSelector);
            expect($soccerTeamLogo.length).to.equal(2);

            expect(getComputedStyle(row
              .querySelectorAll(soccerTeamLogoSelector)[0]).backgroundImage)
              .to.contain(results[0].snippet.extra.weeks[2].matches[i].hostLogo);

            expect(getComputedStyle(row
              .querySelectorAll(soccerTeamLogoSelector)[1]).backgroundImage)
              .to.contain(results[0].snippet.extra.weeks[2].matches[i].guestLogo);
          });
        });

        it('has result with an existing and correct two numbers', function () {
          const soccerResultSelector = '.scored';


          expect($soccerRow.length).to.be.above(0);
          [...$soccerRow].forEach(function (row, i) {
            const $soccerResult = row.querySelector(soccerResultSelector);
            expect($soccerResult)
              .to.contain.text(results[0].snippet.extra.weeks[2].matches[i].scored);
          });
        });

        it('has an existing date and time', function () {
          const soccerDateSelector = '.time';

          expect($soccerRow.length).to.be.above(0);
          [...$soccerRow].forEach(function (row) {
            const $soccerDate = row.querySelector(soccerDateSelector);
            expect($soccerDate).to.exist;
          });
        });

        it('has an existing and correct league logo', function () {
          const soccerLeagueLogoSelector = '.league-logo';

          [...$soccerRow].forEach(function (row, i) {
            const $soccerLeagueLogo = row.querySelector(soccerLeagueLogoSelector);
            expect($soccerLeagueLogo).to.exist;
            expect(getComputedStyle(row
              .querySelector(soccerLeagueLogoSelector)).backgroundImage)
              .to.contain(results[0].snippet.extra.weeks[2].matches[i].leagueLogo);
          });
        });
      });
    });
  });


  context('for soccer live ticker  expand table', function () {
    let $resultElement;
    const locale = CliqzUtils.locale.default || CliqzUtils.locale[window.navigator.language];

    before(function () {
      respondWith({ results });
      withHistory([]);
      fillIn('liveticker bundesliga');
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults()[0];
      }).then(function () {
        click($resultElement.querySelector('.result.expand-btn'));

        return waitFor(function () {
          return $resultElement.querySelectorAll('.table-row').length !== 2;
        });
      });
    });

    describe('renders a results table', function () {
      const soccerRowSelector = 'div.soccer a.table-row.result';
      let $soccerRow;

      before(function () {
        $soccerRow = $resultElement.querySelectorAll(soccerRowSelector);
      });


      it('with details of three matches', function () {
        expect($soccerRow.length).to.equal(3);
      });

      describe('with tabs area', function () {
        const soccerTabsSelector = '.dropdown-tab-label';
        let $soccerTabs;

        before(function () {
          $soccerTabs = $resultElement.querySelectorAll(soccerTabsSelector);
        });

        it('with correct amount of tabs', function () {
          expect($soccerTabs.length).to.equal(5);
        });

        it('with correct text in each tab', function () {
          expect($soccerTabs.length).to.be.above(0);

          [...$soccerTabs].forEach(function (tab, i) {
            expect(tab).to.have.text(results[0].snippet.extra.weeks[i].round);
          });
        });
      });

      it('doesn\'t render "Show more" link', function () {
        const soccerShowMoreSelector = 'div.soccer a.expand-btn';
        expect($resultElement.querySelector(soccerShowMoreSelector)).to.not.exist;
      });

      it('with an existing and correct "Powered by" caption', function () {
        const soccerCaptionSelector = 'a.powered-by';
        const $soccerCaption = $resultElement.querySelector(soccerCaptionSelector);
        const poweredBy = locale['soccer-powered-by'].message;
        expect($soccerCaption).to.exist;
        expect($soccerCaption).to.contain.text(poweredBy);
      });

      describe('each match row', function () {
        it('has an existing and correct URL', function () {
          expect($soccerRow.length).to.be.above(0);

          [...$soccerRow].forEach(function (row, i) {
            expect(row.dataset.url).to.exist;
            expect(row.dataset.url)
              .to.equal(results[0].snippet.extra.weeks[2].matches[i].live_url);
          });
        });
      });

      it('has existing and correct names of two teams', function () {
        const soccerTeamSelector = '.fixed-width';


        [...$soccerRow].forEach(function (row, i) {
          const $soccerTeam = row.querySelectorAll(soccerTeamSelector);
          expect($soccerTeam.length).to.equal(2);
          expect($soccerTeam[0])
            .to.have.text(results[0].snippet.extra.weeks[2].matches[i].HOST);
          expect($soccerTeam[1])
            .to.have.text(results[0].snippet.extra.weeks[2].matches[i].GUESS);
        });
      });

      it('has logos of two teams', function () {
        const soccerTeamLogoSelector = '.club-logo div';

        expect($soccerRow.length).to.be.above(0);
        [...$soccerRow].forEach(function (row, i) {
          const $soccerTeamLogo = row.querySelectorAll(soccerTeamLogoSelector);
          expect($soccerTeamLogo.length).to.equal(2);

          expect(getComputedStyle(row
            .querySelectorAll(soccerTeamLogoSelector)[0]).backgroundImage)
            .to.contain(results[0].snippet.extra.weeks[2].matches[i].hostLogo);

          expect(getComputedStyle(row
            .querySelectorAll(soccerTeamLogoSelector)[1]).backgroundImage)
            .to.contain(results[0].snippet.extra.weeks[2].matches[i].guestLogo);
        });
      });

      it('has result with an existing and correct two numbers', function () {
        const soccerResultSelector = '.scored';


        expect($soccerRow.length).to.be.above(0);
        [...$soccerRow].forEach(function (row, i) {
          const $soccerResult = row.querySelector(soccerResultSelector);
          expect($soccerResult)
            .to.contain.text(results[0].snippet.extra.weeks[2].matches[i].scored);
        });
      });

      it('has an existing date and time', function () {
        const soccerDateSelector = '.time';

        expect($soccerRow.length).to.be.above(0);
        [...$soccerRow].forEach(function (row) {
          const $soccerDate = row.querySelector(soccerDateSelector);
          expect($soccerDate).to.exist;
        });
      });

      it('has an existing and correct league logo', function () {
        const soccerLeagueLogoSelector = '.league-logo';
        expect($soccerRow.length).to.be.above(0);
        [...$soccerRow].forEach(function (row, i) {
          const $soccerLeagueLogo = row.querySelector(soccerLeagueLogoSelector);
          expect($soccerLeagueLogo).to.exist;
          expect(getComputedStyle(row
            .querySelector(soccerLeagueLogoSelector)).backgroundImage)
            .to.contain(results[0].snippet.extra.weeks[2].matches[i].leagueLogo);
        });
      });
    });
  });


  context('for soccer live ticker results changing weeks', function () {
    const locale = CliqzUtils.locale.default || CliqzUtils.locale[window.navigator.language];
    let $resultElement;

    before(function () {
      respondWith({ results });
      withHistory([]);
      fillIn('liveticker bundesliga');
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults()[0];
      }).then(function () {
        $resultElement.querySelector('#tab-3').click();
      }).then(function () {
        return waitFor(function () {
          return $resultElement.querySelector('#tab-0').checked === false;
        });
      });
    });

    describe('renders a results table', function () {
      const soccerTableArea = '.soccer';
      const soccerRowSelector = 'a.table-row';
      let $soccerTable;
      let $soccerRow;

      before(function () {
        $soccerTable = $resultElement.querySelector(soccerTableArea);
        $soccerRow = $soccerTable.querySelectorAll(soccerRowSelector);
      });

      it('successfully', function () {
        expect($soccerTable).to.exist;
      });

      it('with details of two matches', function () {
        expect($soccerRow.length).to.equal(2);
      });

      describe('with tabs area', function () {
        const soccerTabsSelector = '.dropdown-tab-label';
        let $soccerTabs;

        before(function () {
          $soccerTabs = $soccerTable.querySelectorAll(soccerTabsSelector);
        });

        it('with correct amount of tabs', function () {
          expect($soccerTabs.length).to.equal(5);
        });

        it('with correct text in each tab', function () {
          if ($soccerTabs.length > 0) {
            [...$soccerTabs].forEach(function (tab, i) {
              expect(tab).to.have.text(results[0].snippet.extra.weeks[i].round);
            });
          } else {
            throw new Error('Soccer results have not been generated.');
          }
        });
      });

      it('with an existing and correct "Show more" being link', function () {
        const soccerShowMoreSelector = 'a.expand-btn';
        const $soccerShowMore = $soccerTable.querySelector(soccerShowMoreSelector);
        const showMore = locale['soccer-expand-button'].message;
        expect($soccerShowMore).to.exist;
        expect($soccerShowMore.dataset.url).to.exist;
        expect($soccerShowMore).to.contain.text(showMore);
      });

      it('with an existing and correct "Powered by" caption', function () {
        const soccerCaptionSelector = 'a.powered-by';
        const $soccerCaption = $soccerTable.querySelector(soccerCaptionSelector);
        const poweredBy = locale['soccer-powered-by'].message;
        expect($soccerCaption).to.exist;
        expect($soccerCaption).to.contain.text(poweredBy);
      });

      describe('each match row', function () {
        it('has an existing and correct URL', function () {
          expect($soccerRow.length).to.be.above(0);
          [...$soccerRow].forEach(function (row, i) {
            expect(row.dataset.url).to.exist;
            expect(row.dataset.url)
              .to.equal(results[0].snippet.extra.weeks[2].matches[i].live_url);
          });
        });

        it('has existing and correct names of two teams', function () {
          const soccerTeamSelector = '.fixed-width';

          expect($soccerRow.length).to.be.above(0);
          [...$soccerRow].forEach(function (row, i) {
            const $soccerTeam = row.querySelectorAll(soccerTeamSelector);
            expect($soccerTeam.length).to.equal(2);
            expect($soccerTeam[0])
              .to.have.text(results[0].snippet.extra.weeks[2].matches[i].HOST);
            expect($soccerTeam[1])
              .to.have.text(results[0].snippet.extra.weeks[2].matches[i].GUESS);
          });
        });

        it('has logos of two teams', function () {
          const soccerTeamLogoSelector = '.club-logo div';

          expect($soccerRow.length).to.be.above(0);
          [...$soccerRow].forEach(function (row, i) {
            const $soccerTeamLogo = row.querySelectorAll(soccerTeamLogoSelector);
            expect($soccerTeamLogo.length).to.equal(2);

            expect(getComputedStyle(row
              .querySelectorAll(soccerTeamLogoSelector)[0]).backgroundImage)
              .to.contain(results[0].snippet.extra.weeks[2].matches[i].hostLogo);

            expect(getComputedStyle(row
              .querySelectorAll(soccerTeamLogoSelector)[1]).backgroundImage)
              .to.contain(results[0].snippet.extra.weeks[2].matches[i].guestLogo);
          });
        });

        it('has result with an existing and correct two numbers', function () {
          const soccerResultSelector = '.scored';


          expect($soccerRow.length).to.be.above(0);
          [...$soccerRow].forEach(function (row, i) {
            const $soccerResult = row.querySelector(soccerResultSelector);
            expect($soccerResult)
              .to.contain.text(results[0].snippet.extra.weeks[2].matches[i].scored);
          });
        });

        it('has an existing date and time', function () {
          const soccerDateSelector = '.time';

          expect($soccerRow.length).to.be.above(0);
          [...$soccerRow].forEach(function (row) {
            const $soccerDate = row.querySelector(soccerDateSelector);
            expect($soccerDate).to.exist;
          });
        });

        it('has an existing and correct league logo', function () {
          const soccerLeagueLogoSelector = '.league-logo';
          expect($soccerRow.length).to.be.above(0);
          [...$soccerRow].forEach(function (row, i) {
            const $soccerLeagueLogo = row.querySelector(soccerLeagueLogoSelector);
            expect($soccerLeagueLogo).to.exist;
            expect(getComputedStyle(row
              .querySelector(soccerLeagueLogoSelector)).backgroundImage)
              .to.contain(results[0].snippet.extra.weeks[2].matches[i].leagueLogo);
          });
        });
      });
    });
  });
}
