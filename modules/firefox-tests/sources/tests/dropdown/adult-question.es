import {
  app,
  blurUrlBar,
  checkMainResult,
  checkAdultButtons,
  checkParent,
  checkSearchResult,
  $cliqzResults,
  CliqzUtils,
  expect,
  fillIn,
  getLocalisedString,
  respondWith,
  waitFor,
  waitForPopup,
  waitForPopupClosed,
  withHistory } from './helpers';
import results from './fixtures/resultsAdultQuestion';

export default function () {
  const query = 'xvideos';
  const mainResultSelector = '.cliqz-result:not(.history)';
  const questionSelector = '.result.adult-question .padded';


  describe('adult question', function () {
    before(function () {
      window.preventRestarts = true;
    });

    after(function () {
      window.preventRestarts = false;
    });

    context('(UI)', function () {
      context('when set to "Always ask"', function () {
        before(async function () {
          blurUrlBar();
          await waitForPopupClosed();
          CliqzUtils.setPref('adultContentFilter', 'moderate');
          respondWith({ results });
          withHistory([]);
          fillIn(query);
          await waitForPopup(1);
          await waitFor(() => $cliqzResults.querySelectorAll('.buttons .result').length === 3);
        });

        after(function () {
          CliqzUtils.setPref('adultContentFilter', 'moderate');
        });

        checkMainResult({ $result: $cliqzResults });
        checkAdultButtons({ $result: $cliqzResults, areButtonsPresent: true });

        it('renders question', function () {
          const $question = $cliqzResults.querySelector(`${mainResultSelector} ${questionSelector}`);
          const questionText = getLocalisedString().adultInfo.message;

          expect($question).to.exist;
          expect($question).to.contain.text(questionText);
        });
      });

      context('when set to "Never block"', function () {
        before(async function () {
          blurUrlBar();
          CliqzUtils.setPref('adultContentFilter', 'liberal');
          respondWith({ results });
          withHistory([]);
          fillIn(query);
          await waitForPopup(1);
        });

        after(function () {
          CliqzUtils.setPref('adultContentFilter', 'moderate');
        });

        checkMainResult({ $result: $cliqzResults });
        checkParent({ $result: $cliqzResults, results });
        checkAdultButtons({ $result: $cliqzResults, areButtonsPresent: false });
      });

      context('when set to "Always block"', function () {
        before(async function () {
          blurUrlBar();
          app.modules.search.action('setDefaultSearchEngine', 'Google');
          CliqzUtils.setPref('adultContentFilter', 'conservative');
          respondWith({ results });
          withHistory([]);
          fillIn(`${query} `);
          await waitForPopup(1);
        });

        after(function () {
          CliqzUtils.setPref('adultContentFilter', 'moderate');
        });

        checkMainResult({ $result: $cliqzResults, isPresent: false });
        checkAdultButtons({ $result: $cliqzResults, areButtonsPresent: false });
        checkSearchResult({ $result: $cliqzResults, query, urlText: 'Search with Google' });
      });
    });

    context('(integration)', function () {
      describe('clicking on "Show Once" button', function () {
        before(async function () {
          blurUrlBar();
          CliqzUtils.setPref('adultContentFilter', 'moderate');
          respondWith({ results });
          withHistory([]);
          fillIn(query);
          await waitFor(() => $cliqzResults.querySelectorAll('.buttons .result')[0]);
          $cliqzResults.querySelectorAll('.buttons .result')[0].click();
          await waitFor(() => !$cliqzResults.querySelector('.btn'));
        });

        after(function () {
          CliqzUtils.setPref('adultContentFilter', 'moderate');
        });

        checkMainResult({ $result: $cliqzResults });
        checkParent({ $result: $cliqzResults, results });
        checkAdultButtons({ $result: $cliqzResults, areButtonsPresent: false });
      });

      describe('clicking on "Always" button', function () {
        before(async function () {
          blurUrlBar();
          app.modules.search.action('setDefaultSearchEngine', 'Google');
          CliqzUtils.setPref('adultContentFilter', 'moderate');
          respondWith({ results });
          withHistory([]);
          fillIn(`${query} `);
          await waitFor(() => $cliqzResults.querySelectorAll('.buttons .result').length === 3);
          $cliqzResults.querySelectorAll('.buttons .result')[1].click();
          await waitFor(() => $cliqzResults.querySelectorAll('.result').length === 1);
        });

        after(function () {
          CliqzUtils.setPref('adultContentFilter', 'moderate');
        });

        checkMainResult({ $result: $cliqzResults, isPresent: false });
        checkAdultButtons({ $result: $cliqzResults, areButtonsPresent: false });
        checkSearchResult({ $result: $cliqzResults, query, urlText: 'Search with Google' });
      });

      describe('clicking on "Never" button', function () {
        before(async function () {
          blurUrlBar();
          CliqzUtils.setPref('adultContentFilter', 'moderate');
          respondWith({ results });
          fillIn(query);
          await waitFor(() => $cliqzResults.querySelectorAll('.buttons .result')[0]);
          $cliqzResults.querySelectorAll('.buttons .result')[2].click();
          await waitFor(() => !$cliqzResults.querySelector('.btn'));
        });

        after(function () {
          CliqzUtils.setPref('adultContentFilter', 'moderate');
        });

        checkMainResult({ $result: $cliqzResults, isPresent: true });
        checkParent({ $result: $cliqzResults, results });
      });
    });
  });
}
