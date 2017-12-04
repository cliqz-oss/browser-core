/* global it, expect, chai, respondWith, fillIn, waitForPopup,
  $cliqzResults, CliqzUtils, window, getComputedStyle */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

import results from './fixtures/resultsSoccerLigaGame';

export default function () {
  context('for soccer liga game results', function () {
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

            chai.expect(getComputedStyle(row
              .querySelectorAll(soccerTeamLogoSelector)[0]).backgroundImage)
              .to.contain(results[0].snippet.extra.matches[i].hostLogo);

            chai.expect(getComputedStyle(row
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
            chai.expect(getComputedStyle(row
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
