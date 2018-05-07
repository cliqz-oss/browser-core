import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fastFillIn,
  fillIn,
  getLocaliseString,
  respondWith,
  waitFor,
  waitForPopup,
  withHistory } from './helpers';

export default function () {
  function getResultString() {
    return $cliqzResults.querySelector('#calc-answer') ?
      $cliqzResults.querySelector('#calc-answer').textContent.trim() : '= -1';
  }

  describe('calculator', function () {
    const testArray = [
      { query: '1 + 1', results: ['2', '2'] },
      { query: '1.1 + 1', results: ['2,1', '2.1'] },
      { query: '1,1 + 1', results: ['2,1', '2.1'] },
      { query: '1,1 + 1.1', results: ['2,2', '2.2'] },
      { query: '1000 + 1', results: ['1 001', '1 001'] },
      { query: '1,000 + 1', results: ['2', '1 001'] },
      { query: '1.000 + 1', results: ['1 001', '2'] },
      { query: '1,111 + 1', results: ['2,111', '1 112'] },
      { query: '1.111 + 1', results: ['1 112', '2.111'] },
      { query: '1.001 + 1,001', results: ['1 002,001', '1 002.001'] },
      { query: '1.111,1 + 1', results: ['1 112,1', '-1'] },
      { query: '1,111.1 + 1', results: ['-1', '1 112.1'] },
      { query: '1.111.111 + 1', results: ['1 111 112', '1 111 112'] },
      { query: '1,111,111 + 1', results: ['1 111 112', '1 111 112'] },
      { query: '1,111.111 + 1', results: ['-1', '1 112.111'] },
      { query: '1.111,111 + 1', results: ['1 112,111', '-1'] },
      { query: '1,111,11 + 1', results: ['-1', '-1'] },
      { query: '1.111.11 + 1', results: ['-1', '-1'] },
      { query: '1,11,111 + 1', results: ['-1', '-1'] },
      { query: '1.11.111 + 1', results: ['-1', '-1'] },
      { query: '1,111 + 1,1', results: ['2,211', '1 112.1'] },
      { query: '1.111 + 1.1', results: ['1 112,1', '2.211'] },
      { query: '0.001 + 1', results: ['1,001', '1.001'] },
      { query: '0,001 + 1', results: ['1,001', '1.001'] },
      { query: '0,001 * 0,001', results: ['0,000001', '0.000001'] },
      { query: '0.001 * 0.001', results: ['0,000001', '0.000001'] },
      { query: '0,001 * 0.001', results: ['0,000001', '0.000001'] },
      { query: '0.001 * 0,001', results: ['0,000001', '0.000001'] },
      { query: '0.111111 * 1', results: ['0,111111', '0.111111'] },
      { query: '0,111111 * 1', results: ['0,111111', '0.111111'] },
      { query: '0.1111111 * 1', results: ['0,111111', '0.111111'] },
      { query: '0,1111111 * 1', results: ['0,111111', '0.111111'] },
    ];

    before(function () {
      window.preventRestarts = true;
      blurUrlBar();
    });

    after(function () {
      window.preventRestarts = false;
    });

    testArray.forEach(function (testCase) {
      context(`for query ${testCase.query}`, function () {
        before(async function () {
          withHistory([]);
          respondWith({ results: [] });
          fastFillIn(testCase.query);
          await waitFor(() =>
            $cliqzResults.querySelector('.result.search').textContent.trim().split('\n')[0] === testCase.query);
        });

        it('renders correct result', function () {
          expect(getResultString()).to.have.string(`= ${
            getLocaliseString({ de: testCase.results[0], default: testCase.results[1] })
          }`);
        });
      });
    });

    describe('ui tests', function () {
      beforeEach(function () {
        blurUrlBar();
        respondWith({ results: [] });
        fillIn('2222 * 2');
        return waitForPopup(2);
      });

      it('renders correct answer', function () {
        expect(getResultString()).to.have.string(`= ${getLocaliseString({ de: '4 444', default: '4 444' })}`);
      });

      it('should have copy text', function () {
        expect(getResultString()).to.have.string(getLocaliseString({ de: 'Klicken zum Kopieren', default: 'Click to copy' }));
      });
    });
  });
}
