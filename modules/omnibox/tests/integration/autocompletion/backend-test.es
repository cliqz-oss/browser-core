import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  mockSearch,
  urlbar,
  waitFor,
  waitForPopup,
  withHistory,
} from '../helpers';
import { testAutocompleteArray, testNoAutocompleteArray } from '../../../core/integration/fixtures/autocompletion';

export default function () {
  describe('autocompletion of backend results', function () {
    before(async function () {
      await blurUrlBar();
    });

    testAutocompleteArray.forEach(function (testCase) {
      context(`query: '${testCase.query}', result url: '${testCase.results[0].url}'`, function () {
        beforeEach(async function () {
          withHistory([]);
          await mockSearch({ results: testCase.results });
          fillIn(testCase.query);
          await waitForPopup();
          await waitFor(async () => {
            const $res = await $cliqzResults.querySelector(`a.result[data-url="${testCase.results[0].url}"]`);
            return $res;
          });
          await waitFor(async () => await urlbar.textValue === testCase.friendlyUrl);
        });

        it('query was autocompleted', async function () {
          expect(await urlbar.selectionStart).to.equal(testCase.query.length);
          expect(await urlbar.selectionEnd).to.equal(testCase.friendlyUrl.length);
        });
      });
    });

    testNoAutocompleteArray.forEach(function (testCase) {
      context(`query: '${testCase.query}', result url: '${testCase.results[0].url}'`, function () {
        beforeEach(async function () {
          withHistory([]);
          await mockSearch({ results: testCase.results });
          fillIn(testCase.query);
          await waitForPopup();
          await waitFor(async () => {
            const $result = await $cliqzResults.querySelector(`.result[href="${testCase.results[0].url}"]`);
            return $result;
          });
        });

        it('query was not autocompleted', async function () {
          expect(await urlbar.textValue).to.equal(testCase.query);
          expect(await urlbar.selectionStart).to.equal(testCase.query.length);
          expect(await urlbar.selectionEnd).to.equal(testCase.query.length);
        });
      });
    });
  });
}
