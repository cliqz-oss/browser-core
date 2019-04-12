/* global $ */
import { getMessage } from '../../../core/i18n';
import inject from '../../../core/kord/inject';

import {
  CLIQZ,
  EventUtils,
  expect,
  getComputedStyle,
  lang,
  urlbar,
  wait,
  waitFor,
  win,
} from '../../core/test-helpers';

import { $cliqzResults } from '../../core/integration/search-helpers';

export * from '../../core/test-helpers';
export * from '../../core/integration/search-helpers';


export function getWindowModule(/* name */) {
  return {
    ui: CLIQZ.UI,
  };
}


export function fastFillIn(text) {
  urlbar.focus();
  urlbar.mInputField.focus();
  urlbar.mInputField.value = '';
  EventUtils.sendString(text);
}


export function click(el, opt) {
  const _opt = opt || {};
  const ev = new MouseEvent('mouseup', {
    bubbles: true,
    cancelable: false,
    ctrlKey: _opt.ctrlKey || true,
    metaKey: _opt.metaKey || true
  });
  el.dispatchEvent(ev);
}


export function respondWithSuggestions(options) {
  // eslint-disable-next-line no-param-reassign
  options = options || {};
  win.CLIQZ.TestHelpers.searchEngines.overrideSuggestionsHandler(
    () => Promise.resolve([options.query, options.results]),
  );
}


// patches getSnippet which calls RichHeader directly
export function respondWithSnippet(res) {
  win.CLIQZ.TestHelpers.http.overrideFetchHandler(() =>
    Promise.resolve({
      json() {
        return Promise.resolve(res);
      },
    }));
}


export function withMultipleHistory(resultsArray) {
  win.CLIQZ.TestHelpers.historySearch.overrideHistorySearchHandler((q, cb) => resultsArray.reduce(
    (chain, current, index) =>
      chain
        .then(() =>
          new Promise((resolve) => {
            const callback = (...args) => { cb(...args); resolve(); };
            setTimeout(callback, current.ms, {
              query: q,
              results: current.res,
              ready: index === resultsArray.length - 1,
            });
          })),
    Promise.resolve()
  ));
}

export function patchGeolocation(geo) {
  inject.service('geolocation', ['setGeolocationProvider']).setGeolocationProvider(() => Promise.resolve(geo));
}


export function $cliqzMessageContainer() {
  return $(win.document.getElementById('cliqz-message-container'));
}


export async function waitForPopupClosed() {
  await waitFor(() => {
    const cliqzPopup = win.document.querySelector('#cliqz-popup');
    return cliqzPopup && cliqzPopup.scrollHeight === 0;
  });

  return wait(200);
}


export async function waitForResult() {
  await waitFor(() => $cliqzResults().find('.cqz-result-box').length > 0);

  return wait(250);
}


export function getLocaliseString(targets) {
  return lang === 'de-DE' ? targets.de : targets.default;
}


export function getLocalisedString(key) {
  return getMessage(key);
}


const mainResultSelector = '.cliqz-result:not(.history)';

/* Check if the main SC area has been rendered
  * @param {object} $result - dropdown element
  * @param (boolean) isPresent - defines if testing presense
      or absence of the main result
*/
export function checkMainResult({ $result, isPresent = true }) {
  if (isPresent) {
    it('renders result successfully', async function () {
      const $mainResult = await $result.querySelector(mainResultSelector);
      expect($mainResult).to.exist;
    });
  } else {
    it('does not render main result', async function () {
      const $mainResult = await $result.querySelector(mainResultSelector);
      expect($mainResult).to.not.exist;
    });
  }
}

/* Check if the main SC area has been rendered
  * @param {object} $result - dropdown element
  * @param {object} historyResults - mocked history response
  * @param (boolean) isPresent - defines if testing presense
      or absence of the history result
*/
export function checkhistoryResult({ $result, historyResults, isPresent = true }) {
  const historyResultSelector = '.cliqz-result.history';
  const singleHistorySelector = 'a.result:not(.sessions)';
  const $historySearchSelector = '.cliqz-result.history.last .sessions';
  const historyLogoSelector = '.logo';
  const historyDescriptionSelector = '.abstract .title';
  const historyUrlSelector = '.abstract .url';
  const historySearchIconSelector = '.history-tool';
  const $historySearchTextSelector = '.abstract span';

  if (isPresent) {
    describe('renders history result', function () {
      it('successfully', async function () {
        const $historyResult = await $result.querySelector(historyResultSelector);
        expect($historyResult).to.exist;
      });

      it('with correct amount of elements', async function () {
        const $allHistoryElements = await $result
          .querySelectorAll(`${historyResultSelector} ${singleHistorySelector}`);
        expect($allHistoryElements.length).to.equal(historyResults.length);
      });

      it('with an option to search in all history results', async function () {
        const $historySearch = await $result.querySelectorAll($historySearchSelector);
        expect($historySearch).to.exist;
      });
    });

    context('each rendered history result', function () {
      it('has an existing logo', async function () {
        const $allHistoryElements = await $result
          .querySelectorAll(`${historyResultSelector} ${singleHistorySelector}`);

        [...$allHistoryElements].forEach(function ($history) {
          expect($history.querySelector(historyLogoSelector)).to.exist;
        });
      });

      it('has an existing and correct description', async function () {
        const $allHistoryElements = await $result
          .querySelectorAll(`${historyResultSelector} ${singleHistorySelector}`);

        [...$allHistoryElements].forEach(function ($history, historyIndex) {
          expect($history.querySelector(historyDescriptionSelector))
            .to.contain.text(historyResults[historyIndex].comment);
        });
      });

      it('has an existing domain', async function () {
        const $allHistoryElements = await $result
          .querySelectorAll(`${historyResultSelector} ${singleHistorySelector}`);

        [...$allHistoryElements].forEach(function ($history) {
          expect($history.querySelector(historyUrlSelector)).to.exist;
        });
      });

      it('links to a correct URL', async function () {
        const $allHistoryElements = await $result
          .querySelectorAll(`${historyResultSelector} ${singleHistorySelector}`);

        [...$allHistoryElements].forEach(function ($history, historyIndex) {
          expect($history.href).to.exist;
          expect($history.href)
            .to.equal(historyResults[historyIndex].value);
        });
      });
    });

    context('the option to search in all history results', function () {
      it('has an existing and correct icon', async function () {
        const $historySearchIcon = await $result
          .querySelector(`${$historySearchSelector} ${historySearchIconSelector}`);

        expect($historySearchIcon).to.exist;
        // expect(win.getComputedStyle($historySearchIcon).backgroundImage)
        //   .to.contain('history_tool_grey');
        expect(await getComputedStyle(`${$historySearchSelector} ${historySearchIconSelector}`, 'backgroundImage'))
          .to.contain('history_tool_grey');
      });

      it('has existing and correct text', async function () {
        const $historySearchText = await $result
          .querySelectorAll(`${$historySearchSelector} ${$historySearchTextSelector}`);
        const foundInHistory = getLocalisedString('results_found_in_history');

        expect($historySearchText).to.contain.text(foundInHistory);
      });
    });
  } else {
    it('does not render history result', async function () {
      const $historyResult = await $result.querySelector(historyResultSelector);
      expect($historyResult).to.not.exist;
    });
  }
}

function checkSoccerCommon({ $result, results }) {
  const soccerAreaSelector = '.soccer';
  const domainSelector = '.soccer-domain:not(.divider)';
  const titleSelector = 'a.soccer-title';
  const captionSelector = 'a.powered-by';

  describe('renders title', function () {
    it('successfully', async function () {
      const $title = await $result
        .querySelector(`${mainResultSelector} ${titleSelector} .padded`);

      expect($title).to.exist;
      expect($title).to.have.text(results[0].snippet.extra.title);
    });

    it('with a correct URL', async function () {
      const $title = await $result
        .querySelector(`${mainResultSelector} ${titleSelector}`);

      expect($title).to.exist;
      expect($title.href).to.exist;
      expect($title.href).to.equal(results[0].snippet.extra.url);
    });

    it('with a correct domain', async function () {
      const $domain = await $result
        .querySelector(`${mainResultSelector} ${domainSelector}`);

      expect($domain).to.exist;
      expect($domain).to.have.text('kicker.de');
    });
  });

  it('renders correct "Powered by" caption', async function () {
    const $caption = await $result
      .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${captionSelector}`);

    expect($caption).to.exist;
    expect($caption).to.contain.text(getLocalisedString('soccer_powered_by'));
  });
}

export function checkSoccerLigaGame({ $result, results, isExpanded = false }) {
  const soccerAreaSelector = '.soccer';
  const rowSelector = 'a.table-row.result';
  const teamSelector = '.fixed-width';
  const teamLogoSelector = '.club-logo-img';
  const scoreSelector = '.scored';
  const dateSelector = '.time';
  const leagueLogoSelector = '.league-logo';
  const showMoreSelector = 'a.expand-btn';

  const newsAreaSelector = '.news-injection';
  const newsHeaderSelector = '.news-injection-title';
  const newsElementSelector = 'a.result';
  const newsThumbnailSelector = '.thumbnail img';
  const newsTitleSelector = '.content .title';
  const newsDomainSelector = '.content .url';
  const newsTimestampSelector = '.content .published-at';

  checkSoccerCommon({ $result, results });

  describe('renders results table', function () {
    it('successfully', async function () {
      const $soccerTable = await $result
        .querySelector(`${mainResultSelector} ${soccerAreaSelector}`);
      expect($soccerTable).to.exist;
    });

    it('with details of correct amount of matches', async function () {
      let amountOfRows = 2;
      if (isExpanded) { amountOfRows = 3; }

      const $allRows = await $result
        .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);
      expect($allRows.length).to.equal(amountOfRows);
    });

    if (isExpanded) {
      it('without "Show more" button', async function () {
        const $showMore = await $result
          .querySelector(`${mainResultSelector} ${soccerAreaSelector} ${showMoreSelector}`);

        expect($showMore).to.not.exist;
      });
    } else {
      it('with a correct "Show more" being a link', async function () {
        const $showMore = await $result
          .querySelector(`${mainResultSelector} ${soccerAreaSelector} ${showMoreSelector}`);

        expect($showMore).to.exist;
        expect($showMore.href).to.exist;
        expect($showMore).to.contain.text(getLocalisedString('soccer_expand_button'));
      });
    }
  });

  context('each table match row', function () {
    it('has a correct URL', async function () {
      const $allRows = await $result
        .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

      expect($allRows.length).to.be.above(0);
      [...$allRows].forEach(function ($row, i) {
        expect($row.href).to.exist;
        expect($row.href)
          .to.equal(results[0].snippet.extra.matches[i].live_url);
      });
    });

    it('has correct names of two teams', async function () {
      const $allRows = await $result
        .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

      expect($allRows.length).to.be.above(0);
      [...$allRows].forEach(function ($row, i) {
        const soccerTeamItem = $row.querySelectorAll(teamSelector);
        expect(soccerTeamItem.length).to.equal(2);
        expect(soccerTeamItem[0]).to.have.text(results[0].snippet.extra.matches[i].HOST);
        expect(soccerTeamItem[1]).to.have.text(results[0].snippet.extra.matches[i].GUESS);
      });
    });

    it('has logos of two teams', async function () {
      const $allRows = await $result
        .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

      expect($allRows.length).to.be.above(0);
      [...$allRows].forEach(async function ($row, i) {
        const $allSoccerTeamLogos = $row.querySelectorAll(teamLogoSelector);
        expect($allSoccerTeamLogos.length).to.equal(2);

        expect(await getComputedStyle($allSoccerTeamLogos[0], 'backgroundImage'))
          .to.contain(results[0].snippet.extra.matches[i].hostLogo);

        expect(await getComputedStyle($allSoccerTeamLogos[1], 'backgroundImage'))
          .to.contain(results[0].snippet.extra.matches[i].guestLogo);
      });
    });

    it('has a result with correct two numbers', async function () {
      const $allRows = await $result
        .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

      expect($allRows.length).to.be.above(0);
      [...$allRows].forEach(function ($row, i) {
        const $score = $row.querySelector(scoreSelector);
        expect($score)
          .to.contain.text(results[0].snippet.extra.matches[i].scored);
      });
    });

    it('has an existing date and time', async function () {
      const $allRows = await $result
        .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

      expect($allRows.length).to.be.above(0);
      [...$allRows].forEach(function ($row) {
        const soccerDateItem = $row.querySelector(dateSelector);
        expect(soccerDateItem).to.exist;
      });
    });

    it('has a correct league logo', async function () {
      const $allRows = await $result
        .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

      expect($allRows.length).to.be.above(0);
      [...$allRows].forEach(async function ($row, i) {
        const $leagueLogo = $row.querySelector(leagueLogoSelector);

        expect($leagueLogo).to.exist;
        expect(await getComputedStyle($leagueLogo, 'backgroundImage'))
          .to.contain(results[0].snippet.extra.matches[i].leagueLogo);
      });
    });
  });

  context('renders news area', function () {
    it('successfully', async function () {
      const $soccerNews = await $result
        .querySelector(`${mainResultSelector} ${newsAreaSelector}`);
      expect($soccerNews).to.exist;
    });

    it('with an existing and correct header', async function () {
      const $newsHeader = await $result
        .querySelector(`${mainResultSelector} ${newsHeaderSelector}`);

      expect($newsHeader).to.exist;
      expect($newsHeader).to.have.text(getLocalisedString('soccer_news_title'));
    });

    it('with two news items', async function () {
      const $allNews = await $result
        .querySelectorAll(`${mainResultSelector} ${newsAreaSelector} ${newsElementSelector}`);
      expect($allNews.length).to.equal(2);
    });

    context('each news item', function () {
      it('has a correct thumbnail', async function () {
        const $allNews = await $result
          .querySelectorAll(`${mainResultSelector} ${newsAreaSelector} ${newsElementSelector}`);

        expect($allNews.length).to.be.above(0);
        [...$allNews].forEach(function ($element, i) {
          const $newsThumbnail = $element.querySelector(newsThumbnailSelector);

          expect($newsThumbnail).to.exist;
          expect($newsThumbnail.src)
            .to.equal(results[0].snippet.deepResults[1].links[i].extra.thumbnail);
        });
      });

      it('has a correct title', async function () {
        const $allNews = await $result
          .querySelectorAll(`${mainResultSelector} ${newsAreaSelector} ${newsElementSelector}`);

        expect($allNews.length).to.be.above(0);
        [...$allNews].forEach(function ($element, i) {
          const $newsTitle = $element.querySelector(newsTitleSelector);

          expect($newsTitle).to.exist;
          expect($newsTitle)
            .to.have.text(results[0].snippet.deepResults[1].links[i].title);
        });
      });

      it('has an existing and correct domain', async function () {
        const $allNews = await $result
          .querySelectorAll(`${mainResultSelector} ${newsAreaSelector} ${newsElementSelector}`);

        expect($allNews.length).to.be.above(0);
        [...$allNews].forEach(function ($element, i) {
          const $newsDomain = $element.querySelector(newsDomainSelector);

          expect($newsDomain).to.exist;
          expect($newsDomain)
            .to.have.text(results[0].snippet.deepResults[1].links[i].extra.domain);
        });
      });

      it('has an existing timestamp', async function () {
        const $allNews = await $result
          .querySelectorAll(`${mainResultSelector} ${newsAreaSelector} ${newsElementSelector}`);

        expect($allNews.length).to.be.above(0);
        [...$allNews].forEach(function ($element) {
          const $newsTimestamp = $element.querySelector(newsTimestampSelector);
          expect($newsTimestamp).to.exist;
        });
      });

      it('has an existing and correct URL', async function () {
        const $allNews = await $result
          .querySelectorAll(`${mainResultSelector} ${newsAreaSelector} ${newsElementSelector}`);

        expect($allNews.length).to.be.above(0);
        [...$allNews].forEach(function ($element, i) {
          expect($element.href).to.exist;
          expect($element.href)
            .to.equal(results[0].snippet.deepResults[1].links[i].url);
        });
      });
    });
  });
}

export function checkSoccerLigaTable({ $result, results, isExpanded = false }) {
  const soccerAreaSelector = '.soccer';
  const rowSelector = '.table-row';
  const showMoreSelector = 'a.expand-btn';
  const teamsHeaderSelector = '.table-header';
  const tableCellSelector = '.table-cell';

  checkSoccerCommon({ $result, results });

  describe('renders results table', function () {
    it('successfully', async function () {
      const $soccerTable = await $result
        .querySelector(`${mainResultSelector} ${soccerAreaSelector}`);
      expect($soccerTable).to.exist;
    });

    it('with details of correct amount of teams', async function () {
      const $allRows = await $result
        .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

      if (!isExpanded) {
        expect($allRows.length).to.equal(6);
      } else {
        expect($allRows.length).to.equal(results[0].snippet.extra.ranking.length);
      }
    });

    if (isExpanded) {
      it('without "Show more" button', async function () {
        const $showMore = await $result
          .querySelector(`${mainResultSelector} ${soccerAreaSelector} ${showMoreSelector}`);

        expect($showMore).to.not.exist;
      });
    } else {
      it('with a correct "Show more" being a link', async function () {
        const $showMore = await $result
          .querySelector(`${mainResultSelector} ${soccerAreaSelector} ${showMoreSelector}`);

        expect($showMore).to.exist;
        expect($showMore.href).to.exist;
        expect($showMore).to.contain.text(getLocalisedString('soccer_expand_button'));
      });
    }

    describe('renders teams header', function () {
      it('successfully', async function () {
        const $teamsHeader = await $result
          .querySelector(`${mainResultSelector} ${soccerAreaSelector} ${teamsHeaderSelector}`);
        expect($teamsHeader).to.exist;
      });

      it('with correct amount of elements', async function () {
        const $allTeamsHeaders = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${teamsHeaderSelector} ${tableCellSelector}`);
        expect($allTeamsHeaders.length).to.equal(10);
      });

      it('with each element having a correct label', async function () {
        const $allTeamsHeaders = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${teamsHeaderSelector} ${tableCellSelector}`);

        expect($allTeamsHeaders[0])
          .to.have.text(results[0].snippet.extra.info_list.rank);
        /* Column #1 has no header */
        expect($allTeamsHeaders[2])
          .to.have.text(results[0].snippet.extra.info_list.club);
        expect($allTeamsHeaders[3])
          .to.have.text(results[0].snippet.extra.info_list.SP);
        expect($allTeamsHeaders[4])
          .to.have.text(results[0].snippet.extra.info_list.S);
        expect($allTeamsHeaders[5])
          .to.have.text(results[0].snippet.extra.info_list.N);
        expect($allTeamsHeaders[6])
          .to.have.text(results[0].snippet.extra.info_list.U);
        expect($allTeamsHeaders[7])
          .to.have.text(results[0].snippet.extra.info_list.goals);
        expect($allTeamsHeaders[8])
          .to.have.text(results[0].snippet.extra.info_list.TD);
        expect($allTeamsHeaders[9])
          .to.have.text(results[0].snippet.extra.info_list.PKT);
      });
    });

    context('each team row', function () {
      it('has a correct index', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $index = $row.querySelectorAll(tableCellSelector)[0];
          expect($index).to.have.text(`${i + 1}`);
        });
      });

      it('has a correct team logo', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(async function ($row, i) {
          const $logo = $row
            .querySelectorAll(tableCellSelector)[1].querySelector('div');

          expect(await getComputedStyle($logo, 'backgroundImage'))
            .to.contain(results[0].snippet.extra.ranking[i].logo);
        });
      });

      it('has a correct team name', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $team = $row.querySelectorAll(tableCellSelector)[2];
          expect($team)
            .to.have.text(results[0].snippet.extra.ranking[i].club);
        });
      });

      it('has a correct amount of matches', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $matches = $row.querySelectorAll(tableCellSelector)[3];
          expect($matches)
            .to.have.text(results[0].snippet.extra.ranking[i].SP.toString());
        });
      });

      it('has an existing and correct amount of victories', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $victories = $row.querySelectorAll(tableCellSelector)[4];
          expect($victories)
            .to.have.text(results[0].snippet.extra.ranking[i].S.toString());
        });
      });

      it('has an existing and correct amount of losses', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $losses = $row.querySelectorAll(tableCellSelector)[5];
          expect($losses)
            .to.have.text(results[0].snippet.extra.ranking[i].N.toString());
        });
      });

      it('has an existing and correct amount of ties', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $ties = $row.querySelectorAll(tableCellSelector)[6];
          expect($ties)
            .to.have.text(results[0].snippet.extra.ranking[i].U.toString());
        });
      });

      it('has an existing and correct amount of goals', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $goals = $row.querySelectorAll(tableCellSelector)[7];
          expect($goals)
            .to.have.text(results[0].snippet.extra.ranking[i].goals);
        });
      });

      it('has an existing and correct difference of goals', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $difference = $row.querySelectorAll(tableCellSelector)[8];
          expect($difference)
            .to.have.text(results[0].snippet.extra.ranking[i].TD.toString());
        });
      });

      it('has an existing and correct amount of points', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $points = $row.querySelectorAll(tableCellSelector)[9];
          expect($points)
            .to.have.text(results[0].snippet.extra.ranking[i].PKT.toString());
        });
      });
    });
  });
}

export function checkSoccerLeague({ $result, results, activeTabIdx = 0 }) {
  const soccerAreaSelector = '.soccer';
  const tabsHeaderSelector = '.dropdown-tabs';
  const tabsGroupLabelSelector = '.dropdown-tab-header';
  const tabSelector = '.dropdown-tab';
  const rowSelector = `#tab-block-${activeTabIdx} .table-row`;
  const teamsHeaderSelector = `#tab-block-${activeTabIdx} .table-header`;
  const tableCellSelector = '.table-cell';

  checkSoccerCommon({ $result, results });

  describe('renders results table', function () {
    it('successfully', async function () {
      const $soccerTable = await $result
        .querySelector(`${mainResultSelector} ${soccerAreaSelector}`);
      expect($soccerTable).to.exist;
    });

    it('with details of correct amount of teams', async function () {
      const $allRows = await $result
        .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);
      expect($allRows.length).to.equal(results[0].snippet.extra.groups[0].ranking.length);
    });

    describe('renders tab header', function () {
      it('successfully', async function () {
        const $tabsHeader = await $result
          .querySelector(`${mainResultSelector} ${soccerAreaSelector} ${tabsHeaderSelector}`);
        expect($tabsHeader).to.exist;
      });

      it('with a correct "Group" label', async function () {
        const $tabsGroupLabel = await $result
          .querySelector(`${mainResultSelector} ${soccerAreaSelector} ${tabsHeaderSelector} ${tabsGroupLabelSelector}`);

        expect($tabsGroupLabel).to.exist;
        expect($tabsGroupLabel).to.contain.text(results[0].snippet.extra.group_name);
      });

      it('with a correct number of rendered tabs', async function () {
        const $allTabs = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${tabsHeaderSelector} ${tabSelector}`);
        expect($allTabs.length).to.equal(results[0].snippet.extra.groups.length);
      });

      it(`with tab #${activeTabIdx} selected as default`, async function () {
        const $allTabs = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${tabsHeaderSelector} ${tabSelector}`);

        expect($allTabs.length).to.be.above(0);
        [...$allTabs].forEach(function ($tab) {
          if ($tab.id === `tab-${activeTabIdx}`) {
            expect($tab.classList.contains('checked')).to.equal(true);
          } else {
            expect($tab.classList.contains('checked')).to.equal(false);
          }
        });
      });
    });

    describe('renders teams header', function () {
      it('successfully', async function () {
        const $teamsHeader = await $result
          .querySelector(`${mainResultSelector} ${soccerAreaSelector} ${teamsHeaderSelector}`);
        expect($teamsHeader).to.exist;
      });

      it('with correct amount of elements', async function () {
        const $allTeamsHeaders = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${teamsHeaderSelector} ${tableCellSelector}`);
        expect($allTeamsHeaders.length).to.equal(10);
      });

      it('with each element having a correct label', async function () {
        const $allTeamsHeaders = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${teamsHeaderSelector} ${tableCellSelector}`);

        expect($allTeamsHeaders[0])
          .to.have.text(results[0].snippet.extra.groups[0].info_list.rank);
        /* Column #1 has no header */
        expect($allTeamsHeaders[2])
          .to.have.text(results[0].snippet.extra.groups[0].info_list.club);
        expect($allTeamsHeaders[3])
          .to.have.text(results[0].snippet.extra.groups[0].info_list.SP);
        expect($allTeamsHeaders[4])
          .to.have.text(results[0].snippet.extra.groups[0].info_list.S);
        expect($allTeamsHeaders[5])
          .to.have.text(results[0].snippet.extra.groups[0].info_list.N);
        expect($allTeamsHeaders[6])
          .to.have.text(results[0].snippet.extra.groups[0].info_list.U);
        expect($allTeamsHeaders[7])
          .to.have.text(results[0].snippet.extra.groups[0].info_list.goals);
        expect($allTeamsHeaders[8])
          .to.have.text(results[0].snippet.extra.groups[0].info_list.TD);
        expect($allTeamsHeaders[9])
          .to.have.text(results[0].snippet.extra.groups[0].info_list.PKT);
      });
    });

    context('each team row', function () {
      it('has a correct index', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $index = $row.querySelectorAll(tableCellSelector)[0];
          expect($index).to.have.text(`${i + 1}`);
        });
      });

      it('has a correct team logo', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(async function ($row, i) {
          const $logo = $row
            .querySelectorAll(tableCellSelector)[1].querySelector('div');

          expect(await getComputedStyle($logo, 'backgroundImage'))
            .to.contain(results[0].snippet.extra.groups[activeTabIdx].ranking[i].logo);
        });
      });

      it('has a correct team name', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $team = $row.querySelectorAll(tableCellSelector)[2];
          expect($team)
            .to.have.text(results[0].snippet.extra.groups[activeTabIdx].ranking[i].club);
        });
      });

      it('has a correct amount of matches', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $matches = $row.querySelectorAll(tableCellSelector)[3];
          expect($matches)
            .to.have.text(results[0].snippet.extra.groups[activeTabIdx].ranking[i].SP.toString());
        });
      });

      it('has an existing and correct amount of victories', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $victories = $row.querySelectorAll(tableCellSelector)[4];
          expect($victories)
            .to.have.text(results[0].snippet.extra.groups[activeTabIdx].ranking[i].S.toString());
        });
      });

      it('has an existing and correct amount of losses', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $losses = $row.querySelectorAll(tableCellSelector)[5];
          expect($losses)
            .to.have.text(results[0].snippet.extra.groups[activeTabIdx].ranking[i].N.toString());
        });
      });

      it('has an existing and correct amount of ties', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $ties = $row.querySelectorAll(tableCellSelector)[6];
          expect($ties)
            .to.have.text(results[0].snippet.extra.groups[activeTabIdx].ranking[i].U.toString());
        });
      });

      it('has an existing and correct amount of goals', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $goals = $row.querySelectorAll(tableCellSelector)[7];
          expect($goals)
            .to.have.text(results[0].snippet.extra.groups[activeTabIdx].ranking[i].goals);
        });
      });

      it('has an existing and correct difference of goals', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $difference = $row.querySelectorAll(tableCellSelector)[8];
          expect($difference)
            .to.have.text(results[0].snippet.extra.groups[activeTabIdx].ranking[i].TD.toString());
        });
      });

      it('has an existing and correct amount of points', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $points = $row.querySelectorAll(tableCellSelector)[9];
          expect($points)
            .to.have.text(results[0].snippet.extra.groups[activeTabIdx].ranking[i].PKT.toString());
        });
      });
    });
  });
}

export function checkSoccerLiveticker({ $result, results, isExpanded = false, activeTabIdx = 2 }) {
  const soccerAreaSelector = '.soccer';
  const tabsHeaderSelector = '.dropdown-tabs';
  const tabSelector = '.dropdown-tab';
  const rowSelector = `#tab-block-${activeTabIdx} .table-row`;
  const teamSelector = '.fixed-width';
  const teamLogoSelector = '.club-logo-img';
  const scoreSelector = '.scored';
  const dateSelector = '.time';
  const leagueLogoSelector = '.league-logo';
  const showMoreSelector = 'a.expand-btn';

  checkSoccerCommon({ $result, results });

  describe('renders results table', function () {
    it('successfully', async function () {
      const $soccerTable = await $result
        .querySelector(`${mainResultSelector} ${soccerAreaSelector}`);
      expect($soccerTable).to.exist;
    });

    it('with details of correct amount of matches', async function () {
      const $allRows = await $result
        .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

      if (!isExpanded) {
        expect($allRows.length).to.equal(2);
      } else {
        expect($allRows.length)
          .to.equal(results[0].snippet.extra.weeks[activeTabIdx].matches.length);
      }
    });

    if (isExpanded) {
      it('without "Show more" button', async function () {
        const $showMore = await $result
          .querySelector(`${mainResultSelector} ${soccerAreaSelector} ${showMoreSelector}`);

        expect($showMore).to.not.exist;
      });
    } else {
      it('with a correct "Show more" being a link', async function () {
        const $showMore = await $result
          .querySelector(`${mainResultSelector} ${soccerAreaSelector} ${showMoreSelector}`);

        expect($showMore).to.exist;
        expect($showMore.href).to.exist;
        expect($showMore).to.contain.text(getLocalisedString('soccer_expand_button'));
      });
    }

    describe('renders tab header', function () {
      it('successfully', async function () {
        const $tabsHeader = await $result
          .querySelector(`${mainResultSelector} ${soccerAreaSelector} ${tabsHeaderSelector}`);
        expect($tabsHeader).to.exist;
      });

      it('with a correct number of rendered tabs', async function () {
        const $allTabs = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${tabsHeaderSelector} ${tabSelector}`);
        expect($allTabs.length).to.equal(results[0].snippet.extra.weeks.length);
      });

      it(`with tab #${activeTabIdx} selected as default`, async function () {
        const $allTabs = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${tabsHeaderSelector} ${tabSelector}`);

        expect($allTabs.length).to.be.above(0);
        [...$allTabs].forEach(function ($tab) {
          if ($tab.id === `tab-${activeTabIdx}`) {
            expect($tab.classList.contains('checked')).to.equal(true);
          } else {
            expect($tab.classList.contains('checked')).to.equal(false);
          }
        });
      });
    });

    context('each table match row', function () {
      it('has a correct URL', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          expect($row.href).to.exist;
          expect($row.href)
            .to.equal(results[0].snippet.extra.weeks[activeTabIdx].matches[i].live_url);
        });
      });

      it('has correct names of two teams', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const soccerTeamItem = $row.querySelectorAll(teamSelector);
          expect(soccerTeamItem.length).to.equal(2);
          expect(soccerTeamItem[0])
            .to.have.text(results[0].snippet.extra.weeks[activeTabIdx].matches[i].HOST);
          expect(soccerTeamItem[1])
            .to.have.text(results[0].snippet.extra.weeks[activeTabIdx].matches[i].GUESS);
        });
      });

      it('has logos of two teams', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(async function ($row, i) {
          const $allSoccerTeamLogos = $row.querySelectorAll(teamLogoSelector);
          expect($allSoccerTeamLogos.length).to.equal(2);

          expect(await getComputedStyle($allSoccerTeamLogos[0], 'backgroundImage'))
            .to.contain(results[0].snippet.extra.weeks[activeTabIdx].matches[i].hostLogo);

          expect(await getComputedStyle($allSoccerTeamLogos[1], 'backgroundImage'))
            .to.contain(results[0].snippet.extra.weeks[activeTabIdx].matches[i].guestLogo);
        });
      });

      it('has a result with correct two numbers', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row, i) {
          const $score = $row.querySelector(scoreSelector);
          expect($score)
            .to.contain.text(results[0].snippet.extra.weeks[activeTabIdx].matches[i].scored);
        });
      });

      it('has an existing date and time', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(function ($row) {
          const soccerDateItem = $row.querySelector(dateSelector);
          expect(soccerDateItem).to.exist;
        });
      });

      it('has a correct league logo', async function () {
        const $allRows = await $result
          .querySelectorAll(`${mainResultSelector} ${soccerAreaSelector} ${rowSelector}`);

        expect($allRows.length).to.be.above(0);
        [...$allRows].forEach(async function ($row, i) {
          const $leagueLogo = $row.querySelector(leagueLogoSelector);

          expect($leagueLogo).to.exist;
          expect(await getComputedStyle($leagueLogo, 'backgroundImage'))
            .to.contain(results[0].snippet.extra.weeks[activeTabIdx].matches[i].leagueLogo);
        });
      });
    });
  });
}

export function checkSearchResult({ $result, query, urlText = 'Search with Google' }) {
  const resultSelector = '.result';
  const searchResultSelector = '.search';
  const logoSelector = '.icons .icon.search';
  const querySelector = '.abstract .strong';
  const $urlSelector = '.abstract .url';

  describe('renders search result', function () {
    it('successfully', async function () {
      const $searchResult = await $result
        .querySelector(`${resultSelector}${searchResultSelector}`);
      expect($searchResult).to.exist;
    });

    it('as the only result', async function () {
      const $allResults = await $result.querySelectorAll(resultSelector);
      expect($allResults.length).to.equal(1);
    });

    it('with correct logo', async function () {
      const $logo = await $result
        .querySelector(`${resultSelector}${searchResultSelector} ${logoSelector}`);
      expect($logo).to.exist;
    });

    it('with correct query', async function () {
      const $query = await $result
        .querySelector(`${resultSelector}${searchResultSelector} ${querySelector}`);

      expect($query).to.exist;
      expect($query).to.contain.text(query);
    });

    it('with correct URL', async function () {
      const $url = await $result
        .querySelector(`${resultSelector}${searchResultSelector} ${$urlSelector}`);

      expect($url).to.exist;
      expect($url).to.contain.text(urlText);
    });
  });
}

/** Check if result buttons have been rendered
  * @param {object} $result - dropdown element
  * @param {object} results - mocked backend response
*/
export function checkButtons({ $result, results }) {
  const buttonsAreaSelector = '.buttons';
  const buttonSelector = '.btn';

  context('renders buttons area', function () {
    it('successfully', async function () {
      const $buttonsArea = await $result.querySelector(buttonsAreaSelector);
      expect($buttonsArea).to.exist;
    });

    it('with correct amount of buttons', async function () {
      const $allButtons = await $result.querySelectorAll(buttonSelector);
      expect($allButtons.length).to.equal(results[0].snippet.deepResults[0].links.length);
    });

    context('each button', function () {
      it('renders with correct text', async function () {
        const $allButtons = await $result.querySelectorAll(buttonSelector);

        expect($allButtons.length).to.be.above(0);
        [...$allButtons].forEach(function ($button, i) {
          expect($button).to.contain.text(results[0].snippet.deepResults[0].links[i].title);
        });
      });

      it('renders with correct URL', async function () {
        const $allButtons = await $result.querySelectorAll(buttonSelector);

        expect($allButtons.length).to.be.above(0);
        [...$allButtons].forEach(function ($button, i) {
          expect($button.href).to.exist;
          expect($button.href).to.contain(results[0].snippet.deepResults[0].links[i].url);
        });
      });
    });
  });
}

/** Check if the adult question buttons have been rendered
  * @param {object} $result - dropdown element
  * @param {boolean} areButtonsPresent - defines if testing presense
      or absence of adult question buttons
*/
export function checkAdultButtons({ $result, areButtonsPresent = true }) {
  const buttonsAreaSelector = '.buttons';
  const adultBtnSelector = 'a.btn';

  if (areButtonsPresent) {
    context('renders adult question buttons', function () {
      it('successfully', async function () {
        const $buttonsArea = await $result
          .querySelector(`${mainResultSelector} ${buttonsAreaSelector}`);
        expect($buttonsArea).to.exist;
      });

      it('in correct amount', async function () {
        const $allLocationBtns = await $result
          .querySelectorAll(`${mainResultSelector} ${buttonsAreaSelector} ${adultBtnSelector}`);
        expect($allLocationBtns.length).to.equal(3);
      });

      it('with correct text', async function () {
        const $allLocationBtns = await $result
          .querySelectorAll(`${mainResultSelector} ${buttonsAreaSelector} ${adultBtnSelector}`);
        const showOnceText = getLocalisedString('show_once');
        const alwaysText = getLocalisedString('always');
        const neverText = getLocalisedString('never');

        expect($allLocationBtns[0].textContent.trim()).to.be.equal(showOnceText);
        expect($allLocationBtns[1].textContent.trim()).to.be.equal(alwaysText);
        expect($allLocationBtns[2].textContent.trim()).to.be.equal(neverText);
      });
    });
  } else {
    it('does not render adult question', async function () {
      const $buttonsArea = await $result
        .querySelector(`${mainResultSelector} ${buttonsAreaSelector}`);
      expect($buttonsArea).to.not.exist;
    });
  }
}

/** Check if the location buttons have been rendered
  * @param {object} $result - dropdown element
  * @param {boolean} areButtonsPresent - defines if testing presense
      or absence of location buttons
  * @param {string} scType - type of smart cliqz, required to return correct buttons text
*/
export function checkLocationButtons({ $result, areButtonsPresent = true, scType = 'cinema' }) {
  const locationAreaSelector = '.location';
  const locationBtnSelector = 'a.btn';
  const allowOnceBtnSelector = '.location-allow-once';
  const alwaysShowBtnSelector = '.location-always-show';

  if (areButtonsPresent) {
    context('renders location buttons', function () {
      it('successfully', async function () {
        const $locationArea = await $result
          .querySelector(`${mainResultSelector} ${locationAreaSelector}`);
        expect($locationArea).to.exist;
      });

      it('in correct amount', async function () {
        const $allLocationBtns = await $result
          .querySelectorAll(`${mainResultSelector} ${locationAreaSelector} ${locationBtnSelector}`);
        expect($allLocationBtns.length).to.equal(2);
      });

      it('with correct text', async function () {
        const $allowOnceBtn = await $result
          .querySelectorAll(`${mainResultSelector} ${locationAreaSelector} ${allowOnceBtnSelector}`);
        const $allowAlwaysBtn = await $result
          .querySelectorAll(`${mainResultSelector} ${locationAreaSelector} ${alwaysShowBtnSelector}`);

        if (scType === 'cinema') {
          expect($allowOnceBtn)
            .to.contain.text(getLocalisedString('cinema_show_location_and_contact'));
          expect($allowAlwaysBtn)
            .to.contain.text(getLocalisedString('cinema_always_show_location'));
        } else if (scType === 'local') {
          expect($allowOnceBtn)
            .to.contain.text(getLocalisedString('show_location_and_contact'));
          expect($allowAlwaysBtn)
            .to.contain.text(getLocalisedString('always_show_location'));
        }
      });
    });
  } else {
    it('does not render location question', async function () {
      const $locationArea = await $result
        .querySelector(`${mainResultSelector} ${locationAreaSelector}`);
      expect($locationArea).to.be.empty;
    });
  }
}

/** Check if the map has been rendered
  * @param {object} $result - dropdown element
  * @param {object} results - mocked backend response
  * $param {booleab} isDistanceShown - defines if testing presense
      or absence of distance element
  * @param {string} scType - type of smart cliqz, required to return correct buttons text
*/
export function checkMap({ $result, results, isDistanceShown = true, scType = 'cinema' }) {
  const mapAreaSelector = '.local-result-wrapper';
  const mapIconSelector = 'a.local-map';
  const mapContactSelector = '.local-info';
  const mapAddressSelector = '.address';
  const mapDistanceSelector = '.distance';
  const mapPhoneSelector = '.local-phone';

  context('renders map area', function () {
    it('successfully', async function () {
      const $mapArea = await $result.querySelector(`${mainResultSelector} ${mapAreaSelector}`);
      expect($mapArea).to.exist;
    });

    it('with an existing map icon with an URL', async function () {
      const $mapIcon = await $result.querySelector(`${mainResultSelector} ${mapAreaSelector} ${mapIconSelector}`);
      expect($mapIcon).to.exist;
      expect($mapIcon.href).to.exist;
    });

    it('with existing and correct contact data', async function () {
      const $mapContact = await $result
        .querySelector(`${mainResultSelector} ${mapAreaSelector} ${mapContactSelector}`);
      const $mapAddress = await $result
        .querySelector(`${mainResultSelector} ${mapAreaSelector} ${mapContactSelector} ${mapAddressSelector}`);
      const $mapDistance = await $result
        .querySelector(`${mainResultSelector} ${mapAreaSelector} ${mapContactSelector} ${mapDistanceSelector}`);
      const $mapPhone = await $result
        .querySelector(`${mainResultSelector} ${mapAreaSelector} ${mapContactSelector} ${mapPhoneSelector}`);

      expect($mapContact).to.exist;
      expect($mapAddress).to.exist;
      if (isDistanceShown) {
        expect($mapDistance).to.exist;
      } else {
        expect($mapDistance).to.not.exist;
      }
      expect($mapPhone).to.exist;

      let resultsText;
      if (scType === 'cinema') {
        resultsText = results[0].snippet.extra.data.cinema;
      } else if (scType === 'local') {
        resultsText = results[0].snippet.extra;
      }

      expect($mapAddress).to.contain.text(resultsText.address);
      expect($mapPhone).to.contain.text(resultsText.phonenumber);
    });
  });
}

/** Check if the parent element has been rendered
* @param {object} $result - dropdown element
* @param {object} results - mocked backend response
*/
export function checkParent({ $result, results }) {
  const parentSelector = 'a.result';
  const parentTitleSelector = '.abstract .title';
  const parentDomainSelector = '.abstract .url';
  const parentDescriptionSelector = '.abstract .description';
  const parentIconSelector = '.icons .logo';

  context('renders parent result', function () {
    it('successfully', async function () {
      const $parent = await $result.querySelector(`${mainResultSelector} ${parentSelector}`);
      expect($parent).to.exist;
    });

    it('with an existing and correct title', async function () {
      const $parentTitle = await $result
        .querySelector(`${mainResultSelector} ${parentSelector} ${parentTitleSelector}`);
      expect($parentTitle).to.exist;
      expect($parentTitle).to.have.text(results[0].snippet.title);
    });

    it('with an existing and correct domain', async function () {
      const $parentDomain = await $result
        .querySelector(`${mainResultSelector} ${parentSelector} ${parentDomainSelector}`);
      expect($parentDomain).to.exist;
      expect($parentDomain).to.have.text(results[0].snippet.friendlyUrl);
    });

    it('with an existing and correct URL', async function () {
      const $parent = await $result.querySelector(`${mainResultSelector} ${parentSelector}`);
      expect($parent.href).to.exist;
      expect($parent.href).to.equal(results[0].url);
    });

    it('with an existing and correct description', async function () {
      const $parentDescription = await $result
        .querySelector(`${mainResultSelector} ${parentSelector} ${parentDescriptionSelector}`);
      expect($parentDescription).to.exist;
      expect($parentDescription).to.have.text(results[0].snippet.description);
    });

    it('with an existing icon', async function () {
      const $parentIcon = await $result
        .querySelector(`${mainResultSelector} ${parentSelector} ${parentIconSelector}`);
      expect($parentIcon).to.exist;
    });
  });
}

/** Check if the parent element has been rendered
* @param {object} $result - dropdown element
* @param {object} amuntOfRowns - amount of expected lotto result rows
*/
export function checkLotto({ $result, amountOfRows }) {
  describe('renders winning results block', function () {
    const lottoResultSelector = '.lotto';
    const headerSelector = '.lotto-date';
    const disclaimerSelector = '.no-guarantee';
    const rowSelector = '.row';

    it('successfully', async function () {
      const $lottoResult = await $result
        .querySelector(`${mainResultSelector} ${lottoResultSelector}`);
      expect($lottoResult).to.exist;
    });

    it('with a correct header', async function () {
      const $header = await $result
        .querySelector(`${mainResultSelector} ${lottoResultSelector} ${headerSelector}`);

      expect($header).to.exist;
      expect($header).to.contain.text(getLocalisedString('lotto_gewinnzahlen'));
      expect($header).to.contain.text('Mittwoch');
      expect($header).to.contain.text('19.7.2017');
    });

    it('with a correct disclaimer', async function () {
      const $disclaimer = await $result
        .querySelector(`${mainResultSelector} ${lottoResultSelector} ${disclaimerSelector}`);

      expect($disclaimer).to.exist;
      expect($disclaimer).to.have.text(getLocalisedString('no_guarantee'));
    });

    it('with correct amount of results blocks', async function () {
      const $allLottoRows = await $result
        .querySelectorAll(`${mainResultSelector} ${lottoResultSelector} ${rowSelector}`);

      expect($allLottoRows.length).to.equal(amountOfRows);
    });
  });
}

export function checkChildren({ $result, results, parentSelector, youtube = false }) {
  const childSelector = '.result';
  const imageSelector = '.thumbnail img';
  const titleSelector = '.abstract .title';
  const domainSelector = '.abstract .url';
  const ageSelector = '.abstract .published-at';
  let descriptionSelector = '.description';
  const viewCountSelector = '.video-views';
  const durationSelector = '.duration';

  describe('renders all childen results', function () {
    it('successfully', async function () {
      const $childrenArea = await $result
        .querySelector(`${mainResultSelector} ${parentSelector}`);
      const $allChildrenElements = await $result
        .querySelectorAll(`${mainResultSelector} ${parentSelector} ${childSelector}`);

      expect($childrenArea).to.exist;
      expect($allChildrenElements.length).to.be.above(0);
    });

    it('with correct images', async function () {
      const $allChildrenElements = await $result
        .querySelectorAll(`${mainResultSelector} ${parentSelector} ${childSelector}`);

      expect($allChildrenElements.length).to.be.above(0);
      [...$allChildrenElements].forEach(function ($child, i) {
        const $childImage = $child.querySelector(imageSelector);

        expect($childImage).to.exist;
        expect($childImage.src).to.exist;
        if (youtube) {
          expect($childImage.src)
            .to.equal(results[0].snippet.deepResults[1].links[i].extra.thumbnail);
        } else {
          expect($childImage.src).to.equal(results[0].snippet.deepResults[1].links[i].extra.media);
        }
      });
    });

    it('with correct titles', async function () {
      const $allChildrenElements = await $result
        .querySelectorAll(`${mainResultSelector} ${parentSelector} ${childSelector}`);

      expect($allChildrenElements.length).to.be.above(0);
      [...$allChildrenElements].forEach(function ($child, i) {
        const $childTitle = $child.querySelector(titleSelector);

        expect($childTitle).to.exist;
        expect($childTitle).to.have.text(results[0].snippet.deepResults[1].links[i].title);
      });
    });

    if (!youtube) {
      it('with correct domains', async function () {
        const $allChildrenElements = await $result
          .querySelectorAll(`${mainResultSelector} ${parentSelector} ${childSelector}`);

        expect($allChildrenElements.length).to.be.above(0);
        [...$allChildrenElements].forEach(function ($child, i) {
          const $childDomain = $child.querySelector(domainSelector);

          expect($childDomain).to.exist;
          expect($childDomain)
            .to.have.text(results[0].snippet.deepResults[1].links[i].extra.domain);
        });
      });
    }

    it('with correct URLs', async function () {
      const $allChildrenElements = await $result
        .querySelectorAll(`${mainResultSelector} ${parentSelector} ${childSelector}`);

      expect($allChildrenElements.length).to.be.above(0);
      [...$allChildrenElements].forEach(function ($child, i) {
        expect($child.href).to.exist;
        expect($child.href).to.equal(results[0].snippet.deepResults[1].links[i].url);
      });
    });

    if (!youtube) {
      it('with existing ages', async function () {
        const $allChildrenElements = await $result
          .querySelectorAll(`${mainResultSelector} ${parentSelector} ${childSelector}`);

        expect($allChildrenElements.length).to.be.above(0);
        [...$allChildrenElements].forEach(function ($child) {
          const $childAge = $child.querySelector(ageSelector);
          expect($childAge).to.exist;
        });
      });
    }

    it('with existing and correct descriptions', async function () {
      if (youtube) {
        descriptionSelector = viewCountSelector;
      }

      const $allChildrenElements = await $result
        .querySelectorAll(`${mainResultSelector} ${parentSelector} ${childSelector}`);

      expect($allChildrenElements.length).to.be.above(0);
      [...$allChildrenElements].forEach(function ($child, i) {
        const $childDescription = $child.querySelector(descriptionSelector);

        expect($childDescription).to.exist;

        if (youtube) {
          expect($childDescription)
            .to.contain.text(results[0].snippet.deepResults[1].links[i].extra.views);
        } else {
          expect($childDescription).to.have.text(results[0]
            .snippet.deepResults[1].links[i].extra.description);
        }
      });
    });

    if (youtube) {
      it('with an existing duration time', async function () {
        const $allChildrenElements = await $result
          .querySelectorAll(`${mainResultSelector} ${parentSelector} ${childSelector}`);

        expect($allChildrenElements.length).to.be.above(0);
        [...$allChildrenElements].forEach(function ($child) {
          const $childDuration = $child.querySelector(durationSelector);
          expect($childDuration).to.exist;
        });
      });
    }
  });
}

/** Check if the table containing movie showings has been rendered
  * @param {object} $result - dropdown element
  * @param {object} results - mocked backend response
  * @param {boolean} isExpanded - defines if testing:
    * presence or absence of the "Show more" button,
    * hardcoded amount of table rows (2) or all rows coming from results
  * @param {number} activeTabIdx - index of currently selected day tab
*/
export function checkTableOfShowings({ $result, results, isExpanded = false, activeTabIdx = 0 }) {
  const showtimeAreaSelector = '.show-time';
  const showtimeTitleSelector = '.showtime-title';
  const showtimeHeaderSelector = '.showtime-cinema-header';
  const showtimeIconSelector = '.location-icon';
  const showtimeCitySelector = '.showtime-city';

  const showtimeTabsSelector = '.dropdown-tab';
  const showtimeActiveTabSelector = `#tab-block-${activeTabIdx}`;
  const showtimeTableRowSelector = '.show-time-row';
  const showtimeMovieTitleSelector = '.movie-title';
  const showtimeMovieTimeSelector = '.show-time-span a.result';
  const showtimeMovieLangSelector = '.movie-language';
  const showtimeMovie3dSelector = 'movie-3d';
  const showMoreBtnSelector = '.expand-btn';

  context('renders showings table', function () {
    it('succesfully', async function () {
      const $showtimeArea = await $result
        .querySelector(`${mainResultSelector} ${showtimeAreaSelector}`);
      expect($showtimeArea).to.exist;
    });

    it('with an existing and correct header', async function () {
      const $showtimeTitle = await $result
        .querySelector(`${mainResultSelector} ${showtimeTitleSelector}`);
      const $showtimeHeader = await $result
        .querySelector(`${mainResultSelector} ${showtimeHeaderSelector}`);
      const $showtimeIcon = await $result
        .querySelector(`${mainResultSelector} ${showtimeIconSelector}`);
      const $showtimeCity = await $result
        .querySelector(`${mainResultSelector} ${showtimeCitySelector}`);
      const iconSelector = `${mainResultSelector} ${showtimeIconSelector}`;

      expect($showtimeTitle).to.exist;
      expect($showtimeHeader).to.exist;
      expect($showtimeHeader).to.contain.text(results[0].snippet.extra.data.cinema.name);
      expect($showtimeIcon).to.exist;
      expect(await getComputedStyle(iconSelector, 'backgroundImage'))
        .to.contain('location-icon.svg');
      expect($showtimeCity).to.exist;
      expect($showtimeCity).to.contain.text(results[0].snippet.extra.data.city);
    });

    it('with existing and correct table tabs', async function () {
      const $allShowTimeTabs = await $result
        .querySelectorAll(`${mainResultSelector} ${showtimeTabsSelector}`);

      expect($allShowTimeTabs.length).to.be.above(0);
      expect($allShowTimeTabs.length)
        .to.equal(results[0].snippet.extra.data.showdates.length);
      [...$allShowTimeTabs].forEach(function (tab, i) {
        expect(tab).to.have.text(results[0].snippet.extra.data.showdates[i].date);
      });
    });

    it(`with tab #${activeTabIdx} being selected as default`, async function () {
      const $allShowTimeTabs = await $result
        .querySelectorAll(`${mainResultSelector} ${showtimeTabsSelector}`);

      expect($allShowTimeTabs.length).to.be.above(0);
      [...$allShowTimeTabs].forEach(function ($tab) {
        if ($tab.id === `tab-${activeTabIdx}`) {
          expect($tab.classList.contains('checked')).to.be.true;
        } else {
          expect($tab.classList.contains('checked')).to.not.be.true;
        }
      });
    });

    it('with correct amount of movies rows', async function () {
      let amountOfRows;

      if (isExpanded) {
        amountOfRows = results[0].snippet.extra.data.showdates[0].movie_list.length;
      } else {
        amountOfRows = 2;
      }
      const $allMovies = await $result
        .querySelectorAll(`${mainResultSelector} ${showtimeActiveTabSelector} ${showtimeTableRowSelector}`);

      expect($allMovies.length).to.equal(amountOfRows);
    });

    it('with correct data in each movie row', async function () {
      const $allMovies = await $result
        .querySelectorAll(`${mainResultSelector} ${showtimeActiveTabSelector} ${showtimeTableRowSelector}`);

      expect($allMovies.length).to.be.above(0);
      [...$allMovies].forEach(function ($row, i) {
        const $movieTitle = $row.querySelector(showtimeMovieTitleSelector);
        const $allMovieTimes = $row.querySelectorAll(showtimeMovieTimeSelector);

        expect($movieTitle).to.contain.text(
          results[0].snippet.extra.data.showdates[activeTabIdx].movie_list[i].title
        );
        expect($allMovieTimes.length).to.equal(
          results[0].snippet.extra.data.showdates[activeTabIdx].movie_list[i].showtimes.length
        );

        [...$allMovieTimes].forEach(async function ($time, j) {
          const $movieLang = await $time.querySelector(showtimeMovieLangSelector);
          const $movie3d = await $time.querySelector(showtimeMovie3dSelector);

          expect($time.href).to.exist;
          expect($time.href).to.equal(
            results[0].snippet.extra.data.showdates[activeTabIdx]
              .movie_list[i].showtimes[j].booking_link
          );

          expect($movieLang).to.exist;
          expect($movieLang).to.contain.text(
            results[0].snippet.extra.data.showdates[activeTabIdx]
              .movie_list[i].showtimes[j].language
          );

          if (results[0].snippet.extra.data.showdates[activeTabIdx].movie_list[i].showtimes[j].is_3d === 'true') {
            expect($movie3d).to.exist;
            expect($movie3d).to.contain.text('3d');
          } else {
            expect($movie3d).to.not.exist;
          }
        });
      });
    });

    if (isExpanded) {
      it('without "Show more" item', async function () {
        const $showMoreButton = await $result
          .querySelector(`${mainResultSelector} ${showMoreBtnSelector}`);
        expect($showMoreButton).to.not.exist;
      });
    } else {
      it('with an existing and correct "Show more" item', async function () {
        const $showMoreButton = await $result
          .querySelector(`${mainResultSelector} ${showMoreBtnSelector}`);
        expect($showMoreButton).to.exist;
        expect($showMoreButton)
          .to.have.trimmed.text(getLocalisedString('general_expand_button'));
        expect($showMoreButton.dataset.url).to.exist;
      });
    }
  });
}

/** Check if the table containing cinemas has been rendered
  * @param {object} $result - dropdown element
  * @param {object} results - mocked backend response
  * @param {boolean} isExpanded - defines if testing:
    * presence or absence of the "Show more" button,
    * hardcoded amount of table rows (2) or all rows coming from results
  * @param {number} activeTabIdx - index of currently selected day tab
*/
export function checkTableOfCinemas({ $result, results, isExpanded = false, activeTabIdx = 0 }) {
  const showtimeAreaSelector = '.show-time';
  const showtimeTitleSelector = '.showtime-title';
  const showtimeHeaderSelector = '.showtime-cinema-header';
  const showtimeIconSelector = '.location-icon';
  const showtimeCitySelector = '.showtime-city';

  const showtimeTabsSelector = '.dropdown-tab';
  const showtimeActiveTabSelector = `#tab-block-${activeTabIdx}`;
  const showtimeTableRowSelector = '.show-time-row';
  const showtimeCinemaNameSelector = '.showtime-cinema-name';
  const showtimeCinemaAddressSelector = '.showtime-cinema-address';
  const showtimeMovieTimeSelector = '.show-time-span a.result';
  const showtimeMovieLangSelector = '.movie-language';
  const showtimeMovie3dSelector = 'movie-3d';
  const showMoreBtnSelector = '.expand-btn';

  context('renders showings table', function () {
    it('succesfully', async function () {
      const $showtimeArea = await $result
        .querySelector(`${mainResultSelector} ${showtimeAreaSelector}`);
      expect($showtimeArea).to.exist;
    });

    it('with an existing and correct header', async function () {
      const $showtimeTitle = await $result
        .querySelector(`${mainResultSelector} ${showtimeTitleSelector}`);
      const $showtimeHeader = await $result
        .querySelector(`${mainResultSelector} ${showtimeHeaderSelector}`);
      const $showtimeIcon = await $result
        .querySelector(`${mainResultSelector} ${showtimeIconSelector}`);
      const $showtimeCity = await $result
        .querySelector(`${mainResultSelector} ${showtimeCitySelector}`);
      const iconSelector = `${mainResultSelector} ${showtimeIconSelector}`;

      expect($showtimeTitle).to.exist;
      expect($showtimeHeader).to.exist;
      expect($showtimeHeader).to.contain.text(getLocalisedString('cinema_movie_showtimes'));
      expect($showtimeHeader).to.contain.text(results[0].snippet.extra.data.title);
      expect($showtimeIcon).to.exist;
      expect(await getComputedStyle(iconSelector, 'backgroundImage'))
        .to.contain('location-icon.svg');
      expect($showtimeCity).to.exist;
      expect($showtimeCity).to.contain.text(results[0].snippet.extra.data.city);
    });

    it('with existing and correct table tabs', async function () {
      const $allShowTimeTabs = await $result
        .querySelectorAll(`${mainResultSelector} ${showtimeTabsSelector}`);

      expect($allShowTimeTabs.length).to.be.above(0);
      expect($allShowTimeTabs.length)
        .to.equal(results[0].snippet.extra.data.showdates.length);
      [...$allShowTimeTabs].forEach(function (tab, i) {
        expect(tab).to.have.text(results[0].snippet.extra.data.showdates[i].date);
      });
    });

    it(`with tab #${activeTabIdx} being selected as default`, async function () {
      const $allShowTimeTabs = await $result
        .querySelectorAll(`${mainResultSelector} ${showtimeTabsSelector}`);

      expect($allShowTimeTabs.length).to.be.above(0);
      [...$allShowTimeTabs].forEach(function ($tab) {
        if ($tab.id === `tab-${activeTabIdx}`) {
          expect($tab.classList.contains('checked')).to.be.true;
        } else {
          expect($tab.classList.contains('checked')).to.not.be.true;
        }
      });
    });

    it('with correct amount of cinemas rows', async function () {
      let amountOfRows;

      if (isExpanded) {
        amountOfRows = results[0].snippet.extra.data.showdates[activeTabIdx].cinema_list.length;
      } else {
        amountOfRows = 2;
      }

      const $allCinemas = await $result
        .querySelectorAll(`${mainResultSelector} ${showtimeActiveTabSelector} ${showtimeTableRowSelector}`);
      expect($allCinemas.length).to.equal(amountOfRows);
    });

    it('with correct data in each cinema row', async function () {
      const $allCinemas = await $result
        .querySelectorAll(`${mainResultSelector} ${showtimeActiveTabSelector} ${showtimeTableRowSelector}`);

      expect($allCinemas.length).to.be.above(0);
      [...$allCinemas].forEach(function ($row, i) {
        const $cinemaName = $row.querySelector(showtimeCinemaNameSelector);
        const $cinemaAddress = $row.querySelector(showtimeCinemaAddressSelector);
        const $allMovieTimes = $row.querySelectorAll(showtimeMovieTimeSelector);

        expect($cinemaName).to.contain.text(
          results[0].snippet.extra.data.showdates[activeTabIdx].cinema_list[i].name
        );
        expect($cinemaAddress).to.contain.text(
          results[0].snippet.extra.data.showdates[activeTabIdx].cinema_list[i].address
        );
        expect($allMovieTimes.length).to.equal(
          results[0].snippet.extra.data.showdates[activeTabIdx].cinema_list[i].showtimes.length
        );

        [...$allMovieTimes].forEach(function ($time, j) {
          const $movieLang = $time.querySelector(showtimeMovieLangSelector);
          const $movie3d = $time.querySelector(showtimeMovie3dSelector);

          expect($time.href).to.exist;
          expect($time.href).to.equal(
            results[0].snippet.extra.data.showdates[activeTabIdx]
              .cinema_list[i].showtimes[j].booking_link
          );

          expect($movieLang).to.exist;
          expect($movieLang).to.contain.text(
            results[0].snippet.extra.data.showdates[activeTabIdx]
              .cinema_list[i].showtimes[j].language
          );

          if (results[0].snippet.extra.data.showdates[activeTabIdx].cinema_list[i].showtimes[j].is_3d === 'true') {
            expect($movie3d).to.exist;
            expect($movie3d).to.contain.text('3d');
          } else {
            expect($movie3d).to.not.exist;
          }
        });
      });
    });

    if (isExpanded) {
      it('without "Show more" item', async function () {
        const $showMoreButton = await $result
          .querySelector(`${mainResultSelector} ${showMoreBtnSelector}`);
        expect($showMoreButton).to.not.exist;
      });
    } else {
      it('with an existing and correct "Show more" item', async function () {
        const $showMoreButton = await $result
          .querySelector(`${mainResultSelector} ${showMoreBtnSelector}`);
        expect($showMoreButton).to.exist;
        expect($showMoreButton)
          .to.have.trimmed.text(getLocalisedString('general_expand_button'));
        expect($showMoreButton.dataset.url).to.exist;
      });
    }
  });
}
