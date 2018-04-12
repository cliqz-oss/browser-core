/* global window */

import {
  blurUrlBar,
  $cliqzResults,
  CliqzUtils,
  expect,
  fillIn,
  getComputedStyle,
  respondWith,
  waitFor,
  waitForPopup,
  withHistory } from './helpers';
import results from './fixtures/resultsSoccerLigaGroup';

export default function () {
  context('for soccer Champions League group results', function () {
    const locale = CliqzUtils.locale.default || CliqzUtils.locale[window.navigator.language];
    let $resultElement;

    before(function () {
      blurUrlBar();
      respondWith({ results });
      withHistory([]);
      fillIn('Champions league');
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults()[0];
      });
    });

    describe('renders a parent soccer result', function () {
      const parentSoccerSelector = 'a.result:not(.history):not(.search)';
      let parentSoccerItem;

      before(function () {
        parentSoccerItem = $resultElement.querySelector(parentSoccerSelector);
      });

      it('successfully', function () {
        expect(parentSoccerItem).to.exist;
      });

      it('with an existing and correct title', function () {
        const parentSoccerTitleSelector = 'div.abstract p span.title';
        const parentSoccerTitleItem = parentSoccerItem.querySelector(parentSoccerTitleSelector);
        expect(parentSoccerTitleItem).to.exist;
        expect(parentSoccerTitleItem).to.have.text(results[0].snippet.title);
      });

      it('with an existing and correct domain', function () {
        const parentSoccerDomainSelector = 'div.abstract p span.url';
        const parentSoccerDomainItem = parentSoccerItem.querySelector(parentSoccerDomainSelector);
        expect(parentSoccerDomainItem).to.exist;
        expect(parentSoccerDomainItem).to.have.text(results[0].snippet.friendlyUrl);
      });

      it('with an existing and correct link', function () {
        const parentSoccerLinkItem = parentSoccerItem.dataset.url;
        expect(parentSoccerLinkItem).to.exist;
        expect(parentSoccerLinkItem).to.equal(results[0].url);
      });

      it('with an existing and correct description', function () {
        const parentSoccerDescSelector = 'div.abstract p span.description';
        const parentSoccerDescItem = parentSoccerItem.querySelector(parentSoccerDescSelector);
        expect(parentSoccerDescItem).to.exist;
        expect(parentSoccerDescItem).to.have.text(results[0].snippet.description);
      });

      it('with an existing icon', function () {
        const parentSoccerIconSelector = 'div.icons span.logo';
        const parentSoccerIconItem = parentSoccerItem.querySelector(parentSoccerIconSelector);
        expect(parentSoccerIconItem).to.exist;
      });
    });

    describe('renders a results table', function () {
      const soccerTableResultSelector = 'div[class=""]:not(.history) div.soccer';
      const soccerRowSelector = '#tab-block-0 .table-row';
      let soccerTableResultItem;
      let soccerRowItem;

      before(function () {
        soccerTableResultItem = $resultElement.querySelector(soccerTableResultSelector);
        soccerRowItem = soccerTableResultItem.querySelectorAll(soccerRowSelector);
      });

      it('successfully', function () {
        expect(soccerTableResultItem).to.exist;
      });

      it('with details of four teams', function () {
        expect(soccerRowItem.length)
          .to.equal(results[0].snippet.extra.groups[0].ranking.length);
      });

      it('with an existing and correct "Powered by" caption', function () {
        const soccerCaptionSelector = 'a.powered-by';
        const soccerCaptionItem = soccerTableResultItem.querySelector(soccerCaptionSelector);
        const poweredBy = locale['soccer-powered-by'].message;
        expect(soccerCaptionItem).to.exist;
        expect(soccerCaptionItem).to.contain.text(poweredBy);
      });

      context('with a title link', function () {
        const soccerTableTitleSelector = 'div[class=""]:not(.history) a.soccer-title';
        let soccerTableTitleItem;

        before(function () {
          soccerTableTitleItem = $resultElement.querySelector(soccerTableTitleSelector);
        });

        it('existing and correct', function () {
          const soccerTitleSelector = 'span.padded';
          const soccerTitleItem = soccerTableTitleItem.querySelector(soccerTitleSelector);
          expect(soccerTitleItem).to.exist;
          expect(soccerTitleItem).to.have.text(results[0].snippet.extra.title);
        });

        it('with correct URL', function () {
          expect(soccerTableTitleItem.dataset.url).to.equal(results[0].snippet.extra.url);
        });

        it('with a correct domain', function () {
          const soccerTitleDomainSelector = 'span.soccer-domain:not(.divider)';
          const soccerTitleDomainItem = soccerTableTitleItem
            .querySelector(soccerTitleDomainSelector);
          expect(soccerTitleDomainItem).to.have.text('kicker.de');
        });
      });

      context('with a groups header with tabs', function () {
        const soccerTableGroupSelector = 'div.dropdown-tabs';
        const soccerGroupTabsSelector = '.dropdown-tab';
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
          expect(soccerTableGroupItem).to.exist;
        });

        it('with existing and correct "Group" text', function () {
          const soccerGroupLabelSelector = 'label.dropdown-tab-header';
          const soccerGroupLabelItem = soccerTableGroupItem
            .querySelectorAll(soccerGroupLabelSelector);
          expect(soccerGroupLabelItem[0]).to.contain.text(results[0].snippet.extra.group_name);
        });

        it('with correct number of rendered tabs', function () {
          expect(soccerGroupTabsItems.length).to.equal(results[0].snippet.extra.groups.length);
        });

        it('with the first tab selected as default', function () {
          expect(soccerTableFirstTab.classList.contains('checked')).to.equal(true);
        });

        it('with remaining tabs not selected as default', function () {
          [...soccerTableRemainingTabs].forEach(function (tab) {
            expect(tab.classList.contains('checked')).to.equal(false);
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
          expect(columnHeaderItem).to.exist;
        });

        it('with correct amount of title elements', function () {
          expect(columnTitleItems.length).to.equal(10);
        });

        it('with correct text', function () {
          expect(columnTitleItems[0])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.rank);
          /* Column #1 has no header */
          expect(columnTitleItems[2])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.club);
          expect(columnTitleItems[3])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.SP);
          expect(columnTitleItems[4])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.S);
          expect(columnTitleItems[5])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.N);
          expect(columnTitleItems[6])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.U);
          expect(columnTitleItems[7])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.goals);
          expect(columnTitleItems[8])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.TD);
          expect(columnTitleItems[9])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.PKT);
        });
      });

      context('each team row', function () {
        const soccerTableCellSelector = 'div.table-cell';

        it('has a correct index', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableIndex = row.querySelectorAll(soccerTableCellSelector)[0];
            expect(soccerTableIndex).to.have.text(`${i + 1}`);
          });
        });

        it('has a correct team logo', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableLogo = row
              .querySelectorAll(soccerTableCellSelector)[1].querySelector('div');

            expect(getComputedStyle(soccerTableLogo).backgroundImage)
              .to.contain(results[0].snippet.extra.groups[0].ranking[i].logo);
          });
        });

        it('has a correct team name', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableTeam = row.querySelectorAll(soccerTableCellSelector)[2];
            expect(soccerTableTeam)
              .to.have.text(results[0].snippet.extra.groups[0].ranking[i].club);
          });
        });

        it('has a correct amount of matches', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableMatches = row.querySelectorAll(soccerTableCellSelector)[3];
            expect(soccerTableMatches)
              .to.have.text(results[0].snippet.extra.groups[0].ranking[i].SP.toString());
          });
        });

        it('has an existing and correct amount of victories', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableVict = row.querySelectorAll(soccerTableCellSelector)[4];
            expect(soccerTableVict)
              .to.have.text(results[0].snippet.extra.groups[0].ranking[i].S.toString());
          });
        });

        it('has an existing and correct amount of losses', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableLoss = row.querySelectorAll(soccerTableCellSelector)[5];
            expect(soccerTableLoss)
              .to.have.text(results[0].snippet.extra.groups[0].ranking[i].N.toString());
          });
        });

        it('has an existing and correct amount of ties', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableTies = row.querySelectorAll(soccerTableCellSelector)[6];
            expect(soccerTableTies)
              .to.have.text(results[0].snippet.extra.groups[0].ranking[i].U.toString());
          });
        });

        it('has an existing and correct amount of goals', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableGoals = row.querySelectorAll(soccerTableCellSelector)[7];
            expect(soccerTableGoals)
              .to.have.text(results[0].snippet.extra.groups[0].ranking[i].goals);
          });
        });

        it('has an existing and correct difference of goals', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableDiff = row.querySelectorAll(soccerTableCellSelector)[8];
            expect(soccerTableDiff)
              .to.have.text(results[0].snippet.extra.groups[0].ranking[i].TD.toString());
          });
        });

        it('has an existing and correct amount of points', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTablePoints = row.querySelectorAll(soccerTableCellSelector)[9];
            expect(soccerTablePoints)
              .to.have.text(results[0].snippet.extra.groups[0].ranking[i].PKT.toString());
          });
        });
      });
    });
  });

  context('for soccer Champions League group results changing Group', function () {
    const locale = CliqzUtils.locale.default || CliqzUtils.locale[window.navigator.language];
    let $resultElement;

    before(function () {
      blurUrlBar();
      respondWith({ results });
      withHistory([]);
      fillIn('Champions league');
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults()[0];
      }).then(function () {
        $resultElement.querySelector('#tab-1').click();
      }).then(function () {
        return waitFor(function () {
          return $resultElement.querySelector('#tab-0').classList.contains('checked') === false;
        });
      });
    });

    describe('renders a parent soccer result', function () {
      const parentSoccerSelector = 'a.result:not(.history):not(.search)';
      let parentSoccerItem;

      before(function () {
        parentSoccerItem = $resultElement.querySelector(parentSoccerSelector);
      });

      it('successfully', function () {
        expect(parentSoccerItem).to.exist;
      });

      it('with an existing and correct title', function () {
        const parentSoccerTitleSelector = 'div.abstract p span.title';
        const parentSoccerTitleItem = parentSoccerItem.querySelector(parentSoccerTitleSelector);
        expect(parentSoccerTitleItem).to.exist;
        expect(parentSoccerTitleItem).to.have.text(results[0].snippet.title);
      });

      it('with an existing and correct domain', function () {
        const parentSoccerDomainSelector = 'div.abstract p span.url';
        const parentSoccerDomainItem = parentSoccerItem.querySelector(parentSoccerDomainSelector);
        expect(parentSoccerDomainItem).to.exist;
        expect(parentSoccerDomainItem).to.have.text(results[0].snippet.friendlyUrl);
      });

      it('with an existing and correct link', function () {
        const parentSoccerLinkItem = parentSoccerItem.href;
        expect(parentSoccerLinkItem).to.exist;
        expect(parentSoccerLinkItem).to.equal(results[0].url);
      });

      it('with an existing and correct description', function () {
        const parentSoccerDescSelector = 'div.abstract p span.description';
        const parentSoccerDescItem = parentSoccerItem.querySelector(parentSoccerDescSelector);
        expect(parentSoccerDescItem).to.exist;
        expect(parentSoccerDescItem).to.have.text(results[0].snippet.description);
      });

      it('with an existing icon', function () {
        const parentSoccerIconSelector = 'div.icons span.logo';
        const parentSoccerIconItem = parentSoccerItem.querySelector(parentSoccerIconSelector);
        expect(parentSoccerIconItem).to.exist;
      });
    });

    describe('renders a results table', function () {
      const soccerTableResultSelector = 'div[class=""]:not(.history) div.soccer';
      const soccerRowSelector = '#tab-block-1 .table-row';
      let soccerTableResultItem;
      let soccerRowItem;

      before(function () {
        soccerTableResultItem = $resultElement.querySelector(soccerTableResultSelector);
        soccerRowItem = soccerTableResultItem.querySelectorAll(soccerRowSelector);
      });

      it('successfully', function () {
        expect(soccerTableResultItem).to.exist;
      });

      it('with details of four teams', function () {
        expect(soccerRowItem.length)
          .to.equal(results[0].snippet.extra.groups[1].ranking.length);
      });

      it('with an existing and correct "Powered by" caption', function () {
        const soccerCaptionSelector = 'a.powered-by';
        const soccerCaptionItem = soccerTableResultItem.querySelector(soccerCaptionSelector);
        const poweredBy = locale['soccer-powered-by'].message;
        expect(soccerCaptionItem).to.exist;
        expect(soccerCaptionItem).to.contain.text(poweredBy);
      });

      context('with a title link', function () {
        const soccerTableTitleSelector = 'div[class=""]:not(.history) a.soccer-title';
        let soccerTableTitleItem;

        before(function () {
          soccerTableTitleItem = $resultElement.querySelector(soccerTableTitleSelector);
        });

        it('existing and correct', function () {
          const soccerTitleSelector = 'span.padded';
          const soccerTitleItem = soccerTableTitleItem.querySelector(soccerTitleSelector);
          expect(soccerTitleItem).to.exist;
          expect(soccerTitleItem).to.have.text(results[0].snippet.extra.title);
        });

        it('with correct URL', function () {
          expect(soccerTableTitleItem.href).to.equal(results[0].snippet.extra.url);
        });

        it('with a correct domain', function () {
          const soccerTitleDomainSelector = 'span.soccer-domain:not(.divider)';
          const soccerTitleDomainItem = soccerTableTitleItem
            .querySelector(soccerTitleDomainSelector);
          expect(soccerTitleDomainItem).to.have.text('kicker.de');
        });
      });

      context('with a groups header with tabs', function () {
        const soccerTableGroupSelector = 'div.dropdown-tabs';
        const soccerGroupTabsSelector = '.dropdown-tab';
        let soccerTableGroupItem;
        let soccerTableFirstTab;
        let soccerTableSecondTab;
        let soccerTableRemainingTabs;
        let soccerGroupTabsItems;

        before(function () {
          soccerTableGroupItem = soccerTableResultItem.querySelector(soccerTableGroupSelector);
          soccerGroupTabsItems = soccerTableGroupItem.querySelectorAll(soccerGroupTabsSelector);
          [soccerTableFirstTab, soccerTableSecondTab, ...soccerTableRemainingTabs] =
          soccerGroupTabsItems;
        });

        it('existing', function () {
          expect(soccerTableGroupItem).to.exist;
        });

        it('with existing and correct "Group" text', function () {
          const soccerGroupLabelSelector = 'label.dropdown-tab-header';
          const soccerGroupLabelItem = soccerTableGroupItem
            .querySelectorAll(soccerGroupLabelSelector);
          expect(soccerGroupLabelItem[0]).to.contain.text(results[0].snippet.extra.group_name);
        });

        it('with correct number of rendered tabs', function () {
          expect(soccerGroupTabsItems.length).to.equal(results[0].snippet.extra.groups.length);
        });

        it('with the second tab selected', function () {
          expect(soccerTableSecondTab.classList.contains('checked')).to.equal(true);
        });

        it('with remaining tabs not selected', function () {
          expect(soccerTableFirstTab.classList.contains('checked')).to.equal(false);
          [...soccerTableRemainingTabs].forEach(function (tab) {
            expect(tab.classList.contains('checked')).to.equal(false);
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
          expect(columnHeaderItem).to.exist;
        });

        it('with correct amount of title elements', function () {
          expect(columnTitleItems.length).to.equal(10);
        });

        it('with correct text', function () {
          expect(columnTitleItems[0])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.rank);
          /* Column #1 has no header */
          expect(columnTitleItems[2])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.club);
          expect(columnTitleItems[3])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.SP);
          expect(columnTitleItems[4])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.S);
          expect(columnTitleItems[5])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.N);
          expect(columnTitleItems[6])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.U);
          expect(columnTitleItems[7])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.goals);
          expect(columnTitleItems[8])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.TD);
          expect(columnTitleItems[9])
            .to.have.text(results[0].snippet.extra.groups[0].info_list.PKT);
        });
      });

      context('each team row', function () {
        const soccerTableCellSelector = '#tab-block-1 .table-cell';

        it('has a correct index', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableIndex = row.querySelectorAll(soccerTableCellSelector)[0];
            expect(soccerTableIndex).to.have.text(`${i + 1}`);
          });
        });

        it('has a correct team logo', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableLogo = row
              .querySelectorAll(soccerTableCellSelector)[1].querySelector('div');

            expect(getComputedStyle(soccerTableLogo).backgroundImage)
              .to.contain(results[0].snippet.extra.groups[1].ranking[i].logo);
          });
        });

        it('has a correct team name', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableTeam = row.querySelectorAll(soccerTableCellSelector)[2];
            expect(soccerTableTeam)
              .to.have.text(results[0].snippet.extra.groups[1].ranking[i].club);
          });
        });

        it('has a correct amount of matches', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableMatches = row.querySelectorAll(soccerTableCellSelector)[3];
            expect(soccerTableMatches)
              .to.have.text(results[0].snippet.extra.groups[1].ranking[i].SP.toString());
          });
        });

        it('has an existing and correct amount of victories', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableVict = row.querySelectorAll(soccerTableCellSelector)[4];
            expect(soccerTableVict)
              .to.have.text(results[0].snippet.extra.groups[1].ranking[i].S.toString());
          });
        });

        it('has an existing and correct amount of losses', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableLoss = row.querySelectorAll(soccerTableCellSelector)[5];
            expect(soccerTableLoss)
              .to.have.text(results[0].snippet.extra.groups[1].ranking[i].N.toString());
          });
        });

        it('has an existing and correct amount of ties', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableTies = row.querySelectorAll(soccerTableCellSelector)[6];
            expect(soccerTableTies)
              .to.have.text(results[0].snippet.extra.groups[1].ranking[i].U.toString());
          });
        });

        it('has an existing and correct amount of goals', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableGoals = row.querySelectorAll(soccerTableCellSelector)[7];
            expect(soccerTableGoals)
              .to.have.text(results[0].snippet.extra.groups[1].ranking[i].goals);
          });
        });

        it('has an existing and correct difference of goals', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTableDiff = row.querySelectorAll(soccerTableCellSelector)[8];
            expect(soccerTableDiff)
              .to.have.text(results[0].snippet.extra.groups[1].ranking[i].TD.toString());
          });
        });

        it('has an existing and correct amount of points', function () {
          [...soccerRowItem].forEach(function (row, i) {
            const soccerTablePoints = row.querySelectorAll(soccerTableCellSelector)[9];
            expect(soccerTablePoints)
              .to.have.text(results[0].snippet.extra.groups[1].ranking[i].PKT.toString());
          });
        });
      });
    });
  });
}
