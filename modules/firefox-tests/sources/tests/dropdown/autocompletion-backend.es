import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fastFillIn,
  respondWith,
  urlbar,
  waitFor,
  withHistory } from './helpers';
import { testAutocompleteArray, testNoAutocompleteArray } from './fixtures/autocompletion';

export default function () {
  describe('autocompletion of backend results', function () {
    before(function () {
      blurUrlBar();
    });

    testAutocompleteArray.forEach(function (testCase) {
      context(`query: '${testCase.query}', result url: '${testCase.results[0].url}'`, function () {
        beforeEach(function () {
          withHistory([]);
          respondWith({ results: testCase.results });
          fastFillIn(testCase.query);
          return waitFor(() => urlbar.textValue !== testCase.query);
        });

        it('query was autocompleted', function () {
          expect(urlbar.textValue).to.equal(testCase.friendlyUrl);
          expect(urlbar.selectionStart).to.equal(testCase.query.length);
          expect(urlbar.selectionEnd).to.equal(testCase.friendlyUrl.length);
        });
      });
    });

    testNoAutocompleteArray.forEach(function (testCase) {
      context(`query: '${testCase.query}', result url: '${testCase.results[0].url}'`, function () {
        beforeEach(function () {
          withHistory([]);
          respondWith({ results: testCase.results });
          fastFillIn(testCase.query);
          return waitFor(() => $cliqzResults()[0].querySelector(`.result[href="${testCase.results[0].url}"]`) !== null);
        });

        it('query was not autocompleted', function () {
          expect(urlbar.textValue).to.equal(testCase.query);
          expect(urlbar.selectionStart).to.equal(testCase.query.length);
          expect(urlbar.selectionEnd).to.equal(testCase.query.length);
        });
      });
    });
  });
}
