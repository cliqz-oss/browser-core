import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fastFillIn,
  respondWith,
  urlbar,
  waitFor,
  withHistory } from '../helpers';

import {
  testAutocompleteArray,
  testNoAutocompleteArray
} from '../fixtures/autocompletion';

export default function () {
  describe('autocompletion of history results', function () {
    before(function () {
      blurUrlBar();
    });

    testAutocompleteArray.forEach(function (testCase) {
      context(`query: '${testCase.query}', result url: '${testCase.results[0].url}'`, function () {
        beforeEach(function () {
          withHistory([{ value: testCase.results[0].url }]);
          respondWith({ results: [] });
          fastFillIn(testCase.query);
          return waitFor(() => urlbar.mInputField.value === testCase.friendlyUrl);
        });

        it('query was autocompleted', function () {
          expect(urlbar.selectionStart).to.equal(testCase.query.length);
          expect(urlbar.selectionEnd).to.equal(testCase.friendlyUrl.length);
        });
      });
    });

    testNoAutocompleteArray.forEach(function (testCase) {
      context(`query: '${testCase.query}', result url: '${testCase.results[0].url}'`, function () {
        beforeEach(function () {
          withHistory([{ value: testCase.results[0].url }]);
          respondWith({ results: [] });
          fastFillIn(testCase.query);
          return waitFor(() =>
            $cliqzResults.querySelector(`.result[href="${testCase.results[0].url}"]`));
        });

        it('query was not autocompleted', function () {
          expect(urlbar.mInputField.value).to.equal(testCase.query);
          expect(urlbar.selectionStart).to.equal(testCase.query.length);
          expect(urlbar.selectionEnd).to.equal(testCase.query.length);
        });
      });
    });
  });
}
