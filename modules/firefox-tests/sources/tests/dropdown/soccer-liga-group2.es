/* global it, expect, chai, respondWith, fillIn, waitForPopup,
$cliqzResults, CliqzUtils, window, getComputedStyle */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

import results from './fixtures/resultsSoccerLigaGroup2';

export default function () {
  context('for soccer Europa League group results', function () {
    const locale = CliqzUtils.locale.default || CliqzUtils.locale[window.navigator.language];
    let resultElement;

    before(function () {
      respondWith({ results });
      fillIn('http://de.uefa.com/uefaeuropaleague');
      return waitForPopup().then(function () {
        resultElement = $cliqzResults()[0];
      });
    });

    describe('renders a parent soccer result', function () {
      const parentSoccerSelector = 'div[class=""]:not(.history) a.result';
      let parentSoccerItem;

      before(function () {
        parentSoccerItem = resultElement.querySelector(parentSoccerSelector);
      });

      it('successfully', function () {
        chai.expect(parentSoccerItem).to.exist;
      });

      it('with an existing and correct title', function () {
        const parentSoccerTitleSelector = 'div.abstract p span.title';
        const parentSoccerTitleItem = parentSoccerItem.querySelector(parentSoccerTitleSelector);
        chai.expect(parentSoccerTitleItem).to.exist;
        chai.expect(parentSoccerTitleItem).to.have.text(results[0].snippet.title);
      });

      it('with an existing and correct domain', function () {
        const parentSoccerDomainSelector = 'div.abstract p span.url';
        const parentSoccerDomainItem = parentSoccerItem.querySelector(parentSoccerDomainSelector);
        chai.expect(parentSoccerDomainItem).to.exist;
        chai.expect(parentSoccerDomainItem).to.have.text(results[0].snippet.friendlyUrl);
      });

      it('with an existing and correct link', function () {
        const parentSoccerLinkItem = parentSoccerItem.href;
        chai.expect(parentSoccerLinkItem).to.exist;
        chai.expect(parentSoccerLinkItem).to.equal(results[0].url);
      });

      it('with an existing and correct description', function () {
        const parentSoccerDescSelector = 'div.abstract p span.description';
        const parentSoccerDescItem = parentSoccerItem.querySelector(parentSoccerDescSelector);
        chai.expect(parentSoccerDescItem).to.exist;
        chai.expect(parentSoccerDescItem).to.have.text(results[0].snippet.description);
      });

      it('with an existing icon', function () {
        const parentSoccerIconSelector = 'div.icons span.logo';
        const parentSoccerIconItem = parentSoccerItem.querySelector(parentSoccerIconSelector);
        chai.expect(parentSoccerIconItem).to.exist;
      });
    });

    describe('renders a results table', function () {
      const soccerTableResultSelector = 'div[class=""]:not(.history) div.soccer';
      const soccerRowSelector = 'div.table-row';
      let soccerTableResultItem;
      let soccerRowItem;

      before(function () {
        soccerTableResultItem = resultElement.querySelector(soccerTableResultSelector);
        soccerRowItem = soccerTableResultItem.querySelectorAll(soccerRowSelector);
      });

      it('successfully', function () {
        chai.expect(soccerTableResultItem).to.exist;
      });

      it('with details of four teams', function () {
        chai.expect(soccerRowItem.length)
          .to.equal(results[0].snippet.extra.groups[0].ranking.length);
      });

      it('with an existing and correct "Powered by" caption', function () {
        const soccerCaptionSelector = 'a.powered-by';
        const soccerCaptionItem = soccerTableResultItem.querySelector(soccerCaptionSelector);
        const poweredBy = locale['soccer-powered-by'].message;
        chai.expect(soccerCaptionItem).to.exist;
        chai.expect(soccerCaptionItem).to.contain.text(poweredBy);
      });

      context('with a title link', function () {
        const soccerTableTitleSelector = 'div[class=""]:not(.history) a.soccer-title';
        let soccerTableTitleItem;

        before(function () {
          soccerTableTitleItem = resultElement.querySelector(soccerTableTitleSelector);
        });

        it('existing and correct', function () {
          const soccerTitleSelector = 'span.padded';
          const soccerTitleItem = soccerTableTitleItem.querySelector(soccerTitleSelector);
          chai.expect(soccerTitleItem).to.exist;
          chai.expect(soccerTitleItem).to.have.text(results[0].snippet.extra.title);
        });

        it('with correct URL', function () {
          chai.expect(soccerTableTitleItem.href).to.equal(results[0].snippet.extra.url);
        });

        it('with a correct domain', function () {
          const soccerTitleDomainSelector = 'span.soccer-domain:not(.divider)';
          const soccerTitleDomainItem = soccerTableTitleItem
            .querySelector(soccerTitleDomainSelector);
          chai.expect(soccerTitleDomainItem).to.have.text('kicker.de');
        });
      });

      context('with a groups header with tabs', function () {
        const soccerTableGroupSelector = 'div.dropdown-tabs';
        const soccerGroupTabsSelector = 'input.tab-radio-input';
        let soccerTableGroupItem;
        let soccerTableFirstTab;
        let soccerTableRemainingTabs;
        let soccerGroupTabsItems;

        before(function () {
          soccerTableGroupItem = soccerTableResultItem.querySelector(soccerTableGroupSelector);
          soccerGroupTabsItems = soccerTableGroupItem.querySelectorAll(soccerGroupTabsSelector);
          [soccerTableFirstTab, ...soccerTableRemainingTabs] = soccerGroupTabsItems;
        });

        it('existing', function () {
          chai.expect(soccerTableGroupItem).to.exist;
        });

        it('with existing and correct "Group" text', function () {
          const soccerGroupLabelSelector = 'label.dropdown-tab-label';
          const soccerGroupLabelItem = soccerTableGroupItem
            .querySelectorAll(soccerGroupLabelSelector);
          chai.expect(soccerGroupLabelItem[0]).to.contain.text(results[0].snippet.extra.group_name);
        });

        it('with correct number of rendered tabs', function () {
          chai.expect(soccerGroupTabsItems.length).to.equal(results[0].snippet.extra.groups.length);
        });

        it('with the first tab selected as default', function () {
          chai.expect(soccerTableFirstTab.checked).to.equal(true);
        });

        it('with remaining tabs not selected as default', function () {
          [...soccerTableRemainingTabs].forEach(function (tab) {
            chai.expect(tab.checked).to.equal(false);
          });
        });
      });

      context('with a header with column titles', function () {
        const columnHeaderSelector = 'div.table-header';
        const columnTitleSelector = 'div.table-cell';
        let columnHeaderItem;
        let columnTitleItems;

        before(function () {
          columnHeaderItem = soccerTableResultItem.querySelector(columnHeaderSelector);
          columnTitleItems = columnHeaderItem.querySelectorAll(columnTitleSelector);
        });

        it('existing', function () {
          chai.expect(columnHeaderItem).to.exist;
        });

        it('with correct amount of title elements', function () {
          chai.expect(columnTitleItems.length).to.equal(10);
        });

        it('with correct text', function () {
          chai.expect(columnTitleItems[0])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.rank);
          /* Column #1 has no header */
          chai.expect(columnTitleItems[2])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.club);
          chai.expect(columnTitleItems[3])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.SP);
          chai.expect(columnTitleItems[4])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.S);
          chai.expect(columnTitleItems[5])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.N);
          chai.expect(columnTitleItems[6])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.U);
          chai.expect(columnTitleItems[7])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.goals);
          chai.expect(columnTitleItems[8])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.TD);
          chai.expect(columnTitleItems[9])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.PKT);
        });
      });

      context('each team row', function () {
        const soccerTableCellSelector = 'div.table-cell';

        it('has a correct index', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableIndex = row.querySelectorAll(soccerTableCellSelector)[0];
            chai.expect(soccerTableIndex).to.have.text(`${i + 1}`);
          });
        });

        it('has a correct team logo', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableLogo = row
              .querySelectorAll(soccerTableCellSelector)[1].querySelector('div');

            chai.expect(getComputedStyle(soccerTableLogo).backgroundImage)
              .to.contain(results[0].snippet.extra.groups[0].ranking[i].logo);
          });
        });

        it('has a correct team name', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableTeam = row.querySelectorAll(soccerTableCellSelector)[2];
            chai.expect(soccerTableTeam)
              .to.have.text(results[0].snippet.extra.groups[0].ranking[i].club);
          });
        });

        it('has a correct amount of matches', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableMatches = row.querySelectorAll(soccerTableCellSelector)[3];
            chai.expect(soccerTableMatches)
              .to.have.text(results[0].snippet.extra.groups[0].ranking[i].SP.toString());
          });
        });

        it('has an existing and correct amount of victories', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableVict = row.querySelectorAll(soccerTableCellSelector)[4];
            chai.expect(soccerTableVict)
              .to.have.text(results[0].snippet.extra.groups[0].ranking[i].S.toString());
          });
        });

        it('has an existing and correct amount of losses', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableLoss = row.querySelectorAll(soccerTableCellSelector)[5];
            chai.expect(soccerTableLoss)
              .to.have.text(results[0].snippet.extra.groups[0].ranking[i].N.toString());
          });
        });

        it('has an existing and correct amount of ties', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableTies = row.querySelectorAll(soccerTableCellSelector)[6];
            chai.expect(soccerTableTies)
              .to.have.text(results[0].snippet.extra.groups[0].ranking[i].U.toString());
          });
        });

        it('has an existing and correct amount of goals', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableGoals = row.querySelectorAll(soccerTableCellSelector)[7];
            chai.expect(soccerTableGoals)
              .to.have.text(results[0].snippet.extra.groups[0].ranking[i].goals);
          });
        });

        it('has an existing and correct difference of goals', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableDiff = row.querySelectorAll(soccerTableCellSelector)[8];
            chai.expect(soccerTableDiff)
              .to.have.text(results[0].snippet.extra.groups[0].ranking[i].TD.toString());
          });
        });

        it('has an existing and correct amount of points', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTablePoints = row.querySelectorAll(soccerTableCellSelector)[9];
            chai.expect(soccerTablePoints)
              .to.have.text(results[0].snippet.extra.groups[0].ranking[i].PKT.toString());
          });
        });
      });
    });
  });
}
