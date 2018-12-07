import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fastFillIn,
  getLocaliseString,
  getLocalisedString,
  mockSearch,
  testsEnabled,
  waitFor,
  waitForPopup,
  withHistory,
} from './helpers';
import testArray from '../../core/integration/fixtures/unitConverter';

export default function () {
  if (!testsEnabled()) { return; }

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
        beforeEach(async function () {
          withHistory([]);
          await mockSearch({ results: [] });
          fastFillIn(testCase.query);
          await waitForPopup(2);
          // wait for result to be changed
          // split() is used to cut the part with 'click to copy'
          await waitFor(() => $cliqzResults.querySelector(converterSelector)
            .textContent.trim().split('\n')[0] !== lastRenderedResult);
        });

        it('expected result was rendered', function () {
          renderedResult = $cliqzResults.querySelector(converterSelector).textContent.trim().split('\n')[0];
          expectedResult = `${testCase.sign} ${getLocaliseString({ de: testCase.answerDe, default: testCase.answerEn })} ${testCase.unitAnswer}`;
          lastRenderedResult = renderedResult;
          expect(renderedResult).to.equal(expectedResult);
          expect($cliqzResults.querySelector(converterSelector).textContent.trim().split('\n')[2].trim())
            .to.equal(getLocalisedString('Click_anywhere_to_copy'));
        });
      });
    });
  });
}
