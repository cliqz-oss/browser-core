import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  respondWith,
  waitForPopup,
  withHistory } from './helpers';
import historyResults from './fixtures/historyResultsHistoryCluster';

export default function () {
  const clusterSelector = '.history.cluster';
  const elementSelector = ':not(.last) a.result';
  const searchSelector = '.last a.result';
  const parentSelector = 'a.result:not(.history-cluster)';
  const otherSelector = 'a.history-cluster';
  const parentIconSelector = '.logo';
  const otherIconSelector = '.micro-logo';
  const descriptionSelector = '.title';
  const domainSelector = '.url';

  context('for history cluster', function () {
    before(async function () {
      window.preventRestarts = true;
      blurUrlBar();
      respondWith({});
      withHistory(historyResults);
      fillIn('partnernet.amazon');
      await waitForPopup(2);
    });

    after(function () {
      window.preventRestarts = false;
    });

    describe('renders history cluster', function () {
      it('successfully', function () {
        const $historyCluster = $cliqzResults.querySelector(clusterSelector);
        expect($historyCluster).to.exist;
      });

      it('with correct amount of cluster elements', function () {
        const $allClusterElements = $cliqzResults
          .querySelectorAll(`${clusterSelector}${elementSelector}`);
        expect($allClusterElements.length).to.equal(historyResults.length);
      });

      it('with an existing option to search in history', function () {
        const $search = $cliqzResults
          .querySelectorAll(`${clusterSelector}${searchSelector}`);
        expect($search).to.exist;
      });

      context('when first element', function () {
        it('renders as the only element with a website icon', function () {
          const $allParentIcons = $cliqzResults
            .querySelectorAll(`${clusterSelector} ${parentSelector} ${parentIconSelector}`);

          expect($allParentIcons.length).to.equal(1);
          expect(getComputedStyle($allParentIcons[0]).backgroundImage)
            .to.contain('amazon');
        });

        it('renders with a correct description', function () {
          const $parentDescription = $cliqzResults
            .querySelector(`${clusterSelector} ${parentSelector} ${descriptionSelector}`);

          expect($parentDescription).to.exist;
          expect($parentDescription).to.have.text(historyResults[0].comment);
        });

        it('renders with a correct domain', function () {
          const $parentDomain = $cliqzResults
            .querySelector(`${clusterSelector} ${parentSelector} ${domainSelector}`);

          expect($parentDomain).to.exist;
          expect($parentDomain).to.have.text('partnernet.amazon.de');
        });

        it('renders with a correct URL', function () {
          const $parent = $cliqzResults
            .querySelector(`${clusterSelector} ${parentSelector}`);

          expect($parent).to.exist;
          expect($parent.href).to.exist;
          expect($parent.href).to.equal(historyResults[0].value);
        });
      });

      context('when other elements', function () {
        it('render with correct cluster icons', function () {
          const $allOtherElements = $cliqzResults
            .querySelectorAll(`${clusterSelector} ${otherSelector}`);

          expect($allOtherElements.length).to.be.above(0);
          [...$allOtherElements].forEach(function ($element) {
            expect(getComputedStyle($element.querySelector(otherIconSelector)).display)
              .to.not.contain('none');
            expect(getComputedStyle($element.querySelector(parentIconSelector)).display)
              .to.contain('none');
          });
        });

        it('render with correct descriptions', function () {
          const $allOtherElements = $cliqzResults
            .querySelectorAll(`${clusterSelector} ${otherSelector} ${descriptionSelector}`);

          expect($allOtherElements.length).to.be.above(0);
          [...$allOtherElements].forEach(function ($element, i) {
            expect($element).to.have.text(historyResults[i + 1].comment);
          });
        });

        it('render with correct domains', function () {
          const $allOtherElements = $cliqzResults
            .querySelectorAll(`${clusterSelector} ${otherSelector} ${domainSelector}`);

          expect($allOtherElements.length).to.be.above(0);
          [...$allOtherElements].forEach(function ($element, i) {
            expect(historyResults[i + 1].value).to.contain($element.textContent);
          });
        });

        it('render with existing and correct URLs', function () {
          const $allOtherElements = $cliqzResults
            .querySelectorAll(`${clusterSelector} ${otherSelector}`);

          expect($allOtherElements.length).to.be.above(0);
          [...$allOtherElements].forEach(function ($element, i) {
            expect($element.href).to.exist;
            expect($element.href).to.equal(historyResults[i + 1].value);
          });
        });
      });
    });
  });
}
