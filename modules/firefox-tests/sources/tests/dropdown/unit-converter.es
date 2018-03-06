import {
  $cliqzResults,
  expect,
  fastFillIn,
  fillIn,
  getLocaliseString,
  respondWith,
  waitFor,
  waitForPopup,
  withHistory } from './helpers';
import testArray from './fixtures/unitConverter';

export default function () {
  describe('unit converter', function () {
    let $resultElement;
    let renderedResult;
    let expectedResult;

    before(function () {
      withHistory([]);
      respondWith({ results: [] });
      fillIn('1 km im m');
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults()[0];
      });
    });

    it('renders correct results', function () {
      const errors = [];
      const resultSelector = '#calc-answer';
      let runTestCount = 0;

      return testArray.reduce(function (chain, testCase) {
        return chain.then(function () {
          withHistory([]);
          respondWith({ results: [] });
          fastFillIn(testCase.query);
          return waitFor(function () {
            $resultElement = $cliqzResults()[0];
            renderedResult = $resultElement.querySelector(resultSelector).textContent.trim().split('\n')[0];
            expectedResult = `= ${getLocaliseString({ de: testCase.answerDe, default: testCase.answerEn })} ${testCase.unitAnswer}`;
            return renderedResult === expectedResult;
          }, 1100).catch(() => {
            throw new Error(`query: ${testCase.query} didn't show expected result in 1100s`);
          });
        }).then(function () {
          expect(renderedResult).to.equal(expectedResult);
          expect($resultElement.querySelector(resultSelector).textContent.trim().split('\n')[2].trim())
            .to.equal(`${getLocaliseString({
              de: 'Klicken zum Kopieren',
              default: 'Click to copy'
            })}`);
          runTestCount += 1;
        }).catch(function (error) {
          errors.push(error);
        });
      }, Promise.resolve()).then(function () {
        errors.forEach(function (error) {
          expect(error.message).to.be.empty;
        });
        expect(runTestCount).to.equal(testArray.length);
      });
    });
  });
}
