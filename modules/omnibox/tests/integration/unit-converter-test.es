import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  getLocaliseString,
  getLocalisedString,
  mockSearch,
  waitFor,
  waitForPopup,
  withHistory,
} from './helpers';
import testArray from '../../core/integration/fixtures/unitConverter';

export default function () {
  describe('unit converter', function () {
    let renderedResult;
    let expectedResult;
    let lastRenderedResult = '';
    const converterSelector = '#calc-answer';

    before(async function () {
      await blurUrlBar();
    });

    testArray.forEach(function (testCase) {
      context(`for query '${testCase.query}'`, function () {
        beforeEach(async function () {
          withHistory([]);
          await mockSearch({ results: [] });
          fillIn(testCase.query);
          await waitForPopup(1);
          // wait for result to be changed
          // split() is used to cut the part with 'click to copy'
          await waitFor(async () => {
            const $converter = await $cliqzResults.querySelector(converterSelector);
            return $converter.textContent.trim().split('\n')[0] !== lastRenderedResult;
          });
        });

        it('expected result was rendered', async function () {
          renderedResult = await $cliqzResults.querySelector(converterSelector);
          const renderedText = renderedResult.textContent.trim().split('\n')[0];
          expectedResult = `${testCase.sign} ${getLocaliseString({ de: testCase.answerDe, default: testCase.answerEn })} ${testCase.unitAnswer}`;
          lastRenderedResult = renderedText;
          expect(renderedText).to.equal(expectedResult);
          expect(renderedResult.textContent.trim().split('\n')[2].trim())
            .to.equal(getLocalisedString('click_anywhere_to_copy'));
        });
      });
    });
  });
}
