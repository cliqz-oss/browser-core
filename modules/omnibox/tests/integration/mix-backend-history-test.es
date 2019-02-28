import {
  $cliqzResults,
  blurUrlBar,
  expect,
  fillIn,
  mockSearch,
  waitFor,
  waitForPopup,
  win,
  withHistory,
  withMultipleHistory,
} from './helpers';

export default function () {
  describe('mixer test', function () {
    const historyUrl1 = 'https://test1.com';
    const historyUrl2 = 'https://test2.com';
    const historyUrl3 = 'https://test3.com';
    const backendUrl1 = 'https://testbackend.com';
    const history1Selector = `.history .result[data-url="${historyUrl1}"]`;
    const history2Selector = `.history .result[data-url="${historyUrl2}"]`;
    const history3Selector = `.history .result[data-url="${historyUrl3}"]`;
    const backend1Selector = `.result[data-url="${backendUrl1}"`;

    before(function () {
      win.preventRestarts = true;
    });

    after(function () {
      win.preventRestarts = false;
    });

    context('query length >= 4', function () {
      context('sent 1 backend, then 1 history', function () {
        const query = 'test ';
        before(async function () {
          await blurUrlBar();
          await mockSearch({ results: [{ url: backendUrl1 }] });
          withHistory([{ value: historyUrl1 }], 600);
        });

        it('backend result is shown, then history result is shown', async function () {
          fillIn(query);
          await waitForPopup(1);
          expect(await $cliqzResults.querySelector(backend1Selector)).to.exist;
          expect(await $cliqzResults.querySelector(history1Selector)).to.not.exist;
          await waitFor(async () =>
            expect(await $cliqzResults.querySelector(history1Selector)).to.exist);
        });
      });
    });

    context('query length < 4', function () {
      context('sent 1 backend, then 1 history', function () {
        const query = 'tes';
        before(async function () {
          await blurUrlBar();
          await mockSearch({ results: [{ url: backendUrl1 }] });
          withHistory([{ value: historyUrl1 }], 600);
        });

        it('both results are shown at the same time', async function () {
          fillIn(query);
          await waitForPopup();
          await waitFor(async () =>
            expect(await $cliqzResults.querySelector(backend1Selector)).to.exist);
          expect(await $cliqzResults.querySelector(history1Selector)).to.exist;
        });
      });

      context('sent results in order: 1 his, 1his, 1 backend, 1 his', function () {
        const query = 'test';
        before(async function () {
          await blurUrlBar();
          await mockSearch({ results: [{ url: backendUrl1 }] }, 1000);
          withMultipleHistory([
            {
              res: [{ value: historyUrl1 }],
              ms: 0,
            },
            {
              res: [{ value: historyUrl2 }],
              ms: 500,
            },
            {
              res: [{ value: historyUrl3 }],
              ms: 1500,
            },
          ]);
        });

        it('results were shown in right order', async function () {
          fillIn(query);
          await waitForPopup(2);
          expect(await $cliqzResults.querySelector(history1Selector)).to.exist;
          await waitFor(async () =>
            expect(await $cliqzResults.querySelector(history2Selector)).to.exist);
          expect(await $cliqzResults.querySelectorAll('.cliqz-result')).to.have.length(3);
          await waitFor(async () =>
            expect(await $cliqzResults.querySelector(backend1Selector)).to.exist);
          expect(await $cliqzResults.querySelectorAll('.cliqz-result')).to.have.length(4);
          await waitFor(async () =>
            expect(await $cliqzResults.querySelector(history3Selector)).to.exist);
        });
      });
    });
  });
}
