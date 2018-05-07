import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fastFillIn,
  getLocaliseString,
  getLocalisedString,
  respondWith,
  waitFor,
  withHistory } from './helpers';
import testArray from './fixtures/unitConverter';

export default function () {
  describe('unit converter', function () {
    let renderedResult;
    let expectedResult;
    let lastRenderedResult = '';
    const converterSelector = '#calc-answer';

    before(function () {
      blurUrlBar();
    });

    testArray.forEach(function (testCase) {
      context(`for query '${testCase.query}'`, function () {
        before(async function () {
          withHistory([]);
          respondWith({ results: [] });
          fastFillIn(testCase.query);
          // wait for result to be changed
          // split() is used to cut the part with 'click to copy'
          await waitFor(() => $cliqzResults.querySelector(converterSelector)
            .textContent.trim().split('\n')[0] !== lastRenderedResult);
        });

        it('expected result was rendered', function () {
          renderedResult = $cliqzResults.querySelector(converterSelector).textContent.trim().split('\n')[0];
          expectedResult = `= ${getLocaliseString({ de: testCase.answerDe, default: testCase.answerEn })} ${testCase.unitAnswer}`;
          lastRenderedResult = renderedResult;
          expect(renderedResult).to.equal(expectedResult);
          expect($cliqzResults.querySelector(converterSelector).textContent.trim().split('\n')[2].trim())
            .to.equal(getLocalisedString().Click_anywhere_to_copy.message);
        });
      });
    });
  });
}
