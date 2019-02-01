import {
  $cliqzResults,
  blurUrlBar,
  expect,
  fillIn,
  getLocaliseString,
  mockSearch,
  waitFor,
  waitForPopup,
  win,
  withHistory,
} from './helpers';

export default function () {
  async function getResultString() {
    const $calculator = await $cliqzResults.querySelector('#calc-answer');
    return $calculator ? $calculator.textContent.trim() : '= -1';
  }

  describe('calculator', function () {
    const testArray = [
      { query: '1 + 1', results: ['=', '2', '2'] },
      { query: '1.1 + 1', results: ['=', '2,1', '2.1'] },
      { query: '1,1 + 1', results: ['=', '2,1', '2.1'] },
      { query: '1,1 + 1.1', results: ['=', '2,2', '2.2'] },
      { query: '1000 + 1', results: ['=', '1 001', '1 001'] },
      { query: '1,000 + 1', results: ['=', '2', '1 001'] },
      { query: '1.000 + 1', results: ['=', '1 001', '2'] },
      { query: '1,111 + 1', results: ['=', '2,111', '1 112'] },
      { query: '1.111 + 1', results: ['=', '1 112', '2.111'] },
      { query: '1.001 + 1,001', results: ['=', '1 002,001', '1 002.001'] },
      { query: '1.111,1 + 1', results: ['=', '1 112,1', '-1'] },
      { query: '1,111.1 + 1', results: ['=', '-1', '1 112.1'] },
      { query: '1.111.111 + 1', results: ['=', '1 111 112', '1 111 112'] },
      { query: '1,111,111 + 1', results: ['=', '1 111 112', '1 111 112'] },
      { query: '1,111.111 + 1', results: ['=', '-1', '1 112.111'] },
      { query: '1.111,111 + 1', results: ['=', '1 112,111', '-1'] },
      { query: '1,111,11 + 1', results: ['=', '-1', '-1'] },
      { query: '1.111.11 + 1', results: ['=', '-1', '-1'] },
      { query: '1,11,111 + 1', results: ['=', '-1', '-1'] },
      { query: '1.11.111 + 1', results: ['=', '-1', '-1'] },
      { query: '1,111 + 1,1', results: ['=', '2,211', '1 112.1'] },
      { query: '1.111 + 1.1', results: ['=', '1 112,1', '2.211'] },
      { query: '0.001 + 1', results: ['=', '1,001', '1.001'] },
      { query: '0,001 + 1', results: ['=', '1,001', '1.001'] },
      { query: '0,001 * 0,001', results: ['=', '0,000001', '0.000001'] },
      { query: '0.001 * 0.001', results: ['=', '0,000001', '0.000001'] },
      { query: '0,001 * 0.001', results: ['=', '0,000001', '0.000001'] },
      { query: '0.001 * 0,001', results: ['=', '0,000001', '0.000001'] },
      { query: '0.111111 * 1', results: ['=', '0,111111', '0.111111'] },
      { query: '0,111111 * 1', results: ['=', '0,111111', '0.111111'] },
      { query: '0.1111111 * 1', results: ['≈', '0,111111', '0.111111'] },
      { query: '0,1111111 * 1', results: ['≈', '0,111111', '0.111111'] },
    ];

    before(async function () {
      win.preventRestarts = true;
      await blurUrlBar();
    });

    after(function () {
      win.preventRestarts = false;
    });

    testArray.forEach(function (testCase) {
      context(`for query ${testCase.query}`, function () {
        before(async function () {
          withHistory([]);
          await mockSearch({ results: [] });
          fillIn(testCase.query);
          await waitFor(async () => {
            const $result = await $cliqzResults.querySelector('.result.search');
            return $result.textContent.trim().split('\n')[0] === testCase.query;
          });
        });

        it('renders correct result', async function () {
          expect(await getResultString()).to.have.string(`${testCase.results[0]} ${
            getLocaliseString({ de: testCase.results[1], default: testCase.results[2] })
          }`);
        });
      });
    });

    describe('ui tests', function () {
      beforeEach(async function () {
        await blurUrlBar();
        await mockSearch({ results: [] });
        fillIn('2222 * 2');
        await waitForPopup(1);
      });

      it('renders correct answer', async function () {
        expect(await getResultString()).to.have.string(`= ${getLocaliseString({ de: '4 444', default: '4 444' })}`);
      });

      it('should have copy text', async function () {
        expect(await getResultString()).to.have.string(getLocaliseString({ de: 'Klicken zum Kopieren', default: 'Click to copy' }));
      });
    });
  });
}
