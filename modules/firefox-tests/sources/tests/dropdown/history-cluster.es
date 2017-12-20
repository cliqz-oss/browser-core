/* global it, chai, respondWith, fillIn, waitForPopup,
          $cliqzResults, withHistory, CliqzUtils */
/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

import historyResults from './fixtures/historyResultsHistoryCluster';

export default function ({ hasHistoryUrl }) {
  context('for a history cluster', function () {
    const results = [];
    let resultElement;

    before(function () {
      respondWith({ results });
      withHistory(historyResults);
      fillIn('amazon');
      return waitForPopup().then(function () {
        resultElement = $cliqzResults()[0];
      });
    });

    describe('renders a history cluster', function () {
      const win = CliqzUtils.getWindow();

      it('successfully', function () {
        const historyClusterSelector = 'div.history.cluster';
        const historyClusterItem = resultElement.querySelector(historyClusterSelector);
        chai.expect(historyClusterItem).to.exist;
      });

      it('with correct amount of cluster elements', function () {
        let clusterElementSelector;

        if (hasHistoryUrl) {
          clusterElementSelector = 'div.history.cluster:not(.last) a.result';
        } else {
          clusterElementSelector = 'div.history.cluster a.result';
        }

        const clusterElements = resultElement.querySelectorAll(clusterElementSelector);
        chai.expect(clusterElements.length).to.equal(historyResults.length);
      });

      if (hasHistoryUrl) {
        it('with an existing option to search in history', function () {
          const clusterSearchSelector = 'div.history.cluster.last a.result';
          const clusterSearchItem = resultElement.querySelectorAll(clusterSearchSelector);
          chai.expect(clusterSearchItem).to.exist;
        });
      }

      context('when first element', function () {
        const clusterParentSelector = 'div.history.cluster a.result:not(.history-cluster):not(.sessions)';

        it('renders as the only one parent', function () {
          const clusterParentItems = resultElement.querySelectorAll(clusterParentSelector);
          chai.expect(clusterParentItems.length).to.equal(1);
        });

        it('renders as the only element with a website icon', function () {
          const clusterParentIconSelector = 'div.history.cluster a.result:not(.history-cluster):not(.sessions) span.logo';
          const clusterParentIconItems = resultElement.querySelectorAll(clusterParentIconSelector);

          chai.expect(clusterParentIconItems.length).to.equal(1);
          chai.expect(win.getComputedStyle(
            resultElement.querySelector(clusterParentIconSelector)).backgroundImage)
            .to.contain('amazon');
        });

        it('renders with an existing and correct description', function () {
          const clusterParentDescSelector = 'div.history.cluster a.result:not(.history-cluster) span.title';
          const clusterParentDescItem = resultElement.querySelector(clusterParentDescSelector);
          chai.expect(clusterParentDescItem).to.exist;
          chai.expect(clusterParentDescItem)
            .to.have.text(historyResults[historyResults.length - 1].comment);
        });

        it('renders with an existing and correct domain', function () {
          const clusterParentDomainSelector = 'div.history.cluster a.result:not(.history-cluster) span.url';
          const clusterParentDomainItem = resultElement.querySelector(clusterParentDomainSelector);
          chai.expect(clusterParentDomainItem).to.exist;
          chai.expect(clusterParentDomainItem).to.have.text('amazon.de');
        });

        it('renders with an existing and correct URL', function () {
          const clusterParentUrlItem = resultElement.querySelector(clusterParentSelector).href;
          chai.expect(clusterParentUrlItem).to.exist;

          /* Order of rendered history is reverted */
          chai.expect(clusterParentUrlItem)
            .to.equal(historyResults[historyResults.length - 1].value);
        });
      });

      context('when other elements', function () {
        let clusterIconSelector;

        if (hasHistoryUrl) {
          clusterIconSelector = 'div.history.cluster:not(.last) a.history-cluster';
        } else {
          clusterIconSelector = 'div.history.cluster a.history-cluster';
        }

        it('render with existing and correct cluster icons', function () {
          const clusterIconItems = resultElement.querySelectorAll(clusterIconSelector);
          [...clusterIconItems].forEach(function (element) {
            chai.expect(win.getComputedStyle(element.querySelector('span.micro-logo')).display)
              .to.not.contain('none');
            chai.expect(win.getComputedStyle(element.querySelector('span.logo')).display)
              .to.contain('none');
          });
        });

        it('render with existing and correct descriptions', function () {
          const clusterDescSelector = 'div.history.cluster a.history-cluster span.title';
          const clusterDescItem = resultElement.querySelectorAll(clusterDescSelector);

          [...clusterDescItem].forEach(function (element, i) {
            chai.expect(element).to.exist;

            /* Order of rendered history is reverted, we also want to to skip the parent element */
            chai.expect(element)
              .to.have.text(historyResults[historyResults.length - 2 - i].comment);
          });
        });

        it('render with existing and correct domains', function () {
          const clusterDomainSelector = 'div.history.cluster:not(.last) a.history-cluster span.url';
          const clusterDomainItem = resultElement.querySelectorAll(clusterDomainSelector);

          [...clusterDomainItem].forEach(function (element, i) {
            chai.expect(element).to.exist;

            /* Order of rendered history is reverted, we also want to to skip the parent element */
            chai.expect(historyResults[historyResults.length - 2 - i].value)
              .to.contain(element.textContent);
          });
        });

        it('render with existing and correct URLs', function () {
          const clusterUrlItem = resultElement.querySelectorAll(clusterIconSelector);

          [...clusterUrlItem].forEach(function (element, i) {
            chai.expect(element.href).to.exist;

            /* Order of rendered history is reverted, we also want to to skip the parent element */
            chai.expect(element.href)
              .to.equal(historyResults[historyResults.length - 2 - i].value);
          });
        });
      });
    });
  });
}
