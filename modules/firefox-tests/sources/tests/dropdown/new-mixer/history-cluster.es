/* eslint func-names: ['error', 'never'] */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

import {
  $cliqzResults,
  CliqzUtils,
  expect,
  fillIn,
  respondWith,
  waitForPopup,
  withHistory } from '../helpers';
import historyResults from '../fixtures/historyResultsHistoryCluster';

export default function () {
  context('for a history cluster', function () {
    const results = [];
    let $resultElement;

    before(function () {
      respondWith({ results });
      withHistory(historyResults);
      fillIn('amazon');
      return waitForPopup().then(function () {
        $resultElement = $cliqzResults()[0];
      });
    });

    describe('renders a history cluster', function () {
      const clusterElementSelector = 'div.history.cluster:not(.last) a.result';
      const win = CliqzUtils.getWindow();

      it('successfully', function () {
        const $historyClusterSelector = 'div.history.cluster';
        const $historyCluster = $resultElement.querySelector($historyClusterSelector);
        expect($historyCluster).to.exist;
      });

      it('with correct amount of cluster elements', function () {
        const clusterElements = $resultElement.querySelectorAll(clusterElementSelector);
        expect(clusterElements.length).to.equal(historyResults.length);
      });

      it('with an existing option to search in history', function () {
        const $clusterSearchSelector = 'div.history.cluster.last a.result';
        const $clusterSearch = $resultElement.querySelectorAll($clusterSearchSelector);
        expect($clusterSearch).to.exist;
      });

      context('when first element', function () {
        const clusterParentSelector = 'div.history.cluster:not(.last) a.result:not(.history-cluster)';

        it('renders as the only one parent', function () {
          const $clusterParents = $resultElement.querySelectorAll(clusterParentSelector);
          expect($clusterParents.length).to.equal(1);
        });

        it('renders as the only element with a website icon', function () {
          const clusterParentIconSelector = 'div.history.cluster:not(.last) a.result:not(.history-cluster) span.logo';
          const $clusterParentIcons = $resultElement.querySelectorAll(clusterParentIconSelector);

          expect($clusterParentIcons.length).to.equal(1);
          expect(win.getComputedStyle(
            $resultElement.querySelector(clusterParentIconSelector)).backgroundImage)
            .to.contain('amazon');
        });

        it('renders with an existing and correct description', function () {
          const $clusterParentDescSelector = 'div.history.cluster:not(.last) a.result:not(.history-cluster) span.title';
          const $clusterParentDesc = $resultElement.querySelector($clusterParentDescSelector);
          expect($clusterParentDesc).to.exist;
          expect($clusterParentDesc)
            .to.have.text(historyResults[0].comment);
        });

        it('renders with an existing and correct domain', function () {
          const $clusterParentDomainSelector = 'div.history.cluster:not(.last) a.result:not(.history-cluster) span.url';
          const $clusterParentDomain = $resultElement.querySelector($clusterParentDomainSelector);
          expect($clusterParentDomain).to.exist;
          expect($clusterParentDomain).to.have.text('amazon.de');
        });

        it('renders with an existing and correct URL', function () {
          const $clusterParentUrl = $resultElement.querySelector(clusterParentSelector).href;
          expect($clusterParentUrl).to.exist;

          expect($clusterParentUrl)
            .to.equal(historyResults[0].value);
        });
      });

      context('when other elements', function () {
        const clusterIconSelector = 'div.history.cluster:not(.last) a.history-cluster';

        it('render with existing and correct cluster icons', function () {
          const $clusterIcons = $resultElement.querySelectorAll(clusterIconSelector);
          [...$clusterIcons].forEach(function (element) {
            expect(win.getComputedStyle(element.querySelector('span.micro-logo')).display)
              .to.not.contain('none');
            expect(win.getComputedStyle(element.querySelector('span.logo')).display)
              .to.contain('none');
          });
        });

        it('render with existing and correct descriptions', function () {
          const $clusterDescSelector = 'div.history.cluster:not(.last) a.history-cluster span.title';
          const $clusterDesc = $resultElement.querySelectorAll($clusterDescSelector);

          [...$clusterDesc].forEach(function (element, i) {
            expect(element).to.exist;

            expect(element)
              .to.have.text(historyResults[i + 1].comment);
          });
        });

        it('render with existing and correct domains', function () {
          const $clusterDomainSelector = 'div.history.cluster:not(.last) a.history-cluster span.url';
          const $clusterDomain = $resultElement.querySelectorAll($clusterDomainSelector);

          [...$clusterDomain].forEach(function (element, i) {
            expect(element).to.exist;

            expect(historyResults[i + 1].value)
              .to.contain(element.textContent);
          });
        });

        it('render with existing and correct URLs', function () {
          const $clusterUrl = $resultElement.querySelectorAll(clusterIconSelector);

          [...$clusterUrl].forEach(function (element, i) {
            expect(element.href).to.exist;

            expect(element.href)
              .to.equal(historyResults[i + 1].value);
          });
        });
      });
    });
  });
}
