import {
  blurUrlBar,
  $cliqzResults,
  expect,
  fillIn,
  mockGetSearchEngines,
  mockSearch,
  newTab,
  press,
  sleep,
  testServer,
  unmockGetSearchEngines,
  urlbar,
  waitFor,
  waitForPopup,
  withHistory,
} from './helpers';

import { getResourceUrl } from '../../../tests/core/integration/helpers';

export default function () {
  context('last query box', function () {
    const freshtabUrl = getResourceUrl('freshtab/home.html');

    context('for "Search with"', function () {
      const url = 'https://url_test.com';
      const query = 'test';
      let getSearchEngines;

      beforeEach(async function () {
        await testServer.registerPathHandler('/search', { result: '<html><body><p>success</p></body></html>' });

        getSearchEngines = mockGetSearchEngines([
          {
            alias: '#te',
            default: true,
            description: 'Test Search',
            encoding: 'UTF-8',
            icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyppVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTMyIDc5LjE1OTI4NCwgMjAxNi8wNC8xOS0xMzoxMzo0MCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUuNSAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo2OUZEQTFEMkM5OTAxMUU2OEQ0RkUxRDFFMjAyNTYxQSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo2OUZEQTFEM0M5OTAxMUU2OEQ0RkUxRDFFMjAyNTYxQSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjlCMjdCRjdGQzkzMjExRTY4RDRGRTFEMUUyMDI1NjFBIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjlCMjdCRjgwQzkzMjExRTY4RDRGRTFEMUUyMDI1NjFBIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+UK0L7QAAB3lJREFU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',
            identifier: 'test-b-d',
            name: 'Test',
            searchForm: testServer.getBaseUrl('search?q={searchTerms}'),
            urls: {
              'text/html': {
                method: 'GET',
                template: testServer.getBaseUrl('search?q={searchTerms}'),
                params: []
              },
              'application/x-suggestions+json': {
                method: 'GET',
                template: testServer.getBaseUrl('search?q={searchTerms}'),
                params: []
              }
            }
          }
        ]);

        await newTab(freshtabUrl, { focus: true });
        await blurUrlBar();
        await mockSearch({ results: [{ url }] });
        withHistory([]);
        fillIn(query);
        await waitForPopup(1, 1000);
      });

      afterEach(function () {
        unmockGetSearchEngines(getSearchEngines);
      });

      it('on Enter renders last query box with the query', async function () {
        press({ key: 'Enter' });
        await waitFor(async () => {
          const lastQueryBox = await urlbar.lastQuery;
          expect(lastQueryBox).to.have.property('visible').that.equal(true);
          return expect(lastQueryBox).to.have.property('text').that.equal(query);
        }, 1000);
      });
    });

    context('for backend result without autocomplete', function () {
      const url = testServer.getBaseUrl('url-test');
      const query = 'test';

      beforeEach(async function () {
        await testServer.registerPathHandler('/url-test', { result: '<html><body><p>success</p></body></html>' });

        await newTab(freshtabUrl, { check: true, focus: true });

        await blurUrlBar();
        await mockSearch({ results: [{ url }] });
        withHistory([]);
        fillIn(query);
        await waitForPopup(1, 2000);
      });

      it('on Enter renders last query box with the query', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(async () => {
          const $result = await $cliqzResults.querySelector(`a.result[data-url="${url}"]`);
          return $result.classList.contains('selected');
        });
        press({ key: 'Enter' });
        await waitFor(async () => {
          const lastQueryBox = await urlbar.lastQuery;
          expect(lastQueryBox).to.have.property('visible').that.equal(true);
          return expect(lastQueryBox).to.have.property('text').that.equal(query);
        }, 1000);
      });
    });

    context('for backend result with autocomplete + navigation', function () {
      const url1 = 'https://test_url1.com';
      const url2 = testServer.getBaseUrl('url-test');
      const query = 'local';

      beforeEach(async function () {
        await testServer.registerPathHandler('/url-test', { result: '<html><body><p>success</p></body></html>' });

        await newTab(freshtabUrl, { focus: true });

        await blurUrlBar();
        await mockSearch({
          results: [
            { url: url1 },
            { url: url2 }
          ]
        });
        withHistory([]);
        fillIn(query);
        await waitForPopup(2, 2000);
      });

      it('on Enter renders last query box with the query', async function () {
        press({ key: 'ArrowDown' });
        await waitFor(async () => {
          const $result1 = await $cliqzResults.querySelector(`a.result[data-url="${url1}"]`);
          return $result1.classList.contains('selected');
        });
        press({ key: 'ArrowDown' });
        await waitFor(async () => {
          const $result2 = await $cliqzResults.querySelector(`a.result[data-url="${url2}"]`);
          return $result2.classList.contains('selected');
        });
        press({ key: 'Enter' });
        await waitFor(async () => {
          const lastQueryBox = await urlbar.lastQuery;
          expect(lastQueryBox).to.have.property('visible').that.equal(true);
          return expect(lastQueryBox).to.have.property('text').that.equal(query);
        }, 1000);
      });
    });

    context('for backend result with autocomplete', function () {
      const url = testServer.getBaseUrl('url-test');
      const query = 'local';

      beforeEach(async function () {
        await testServer.registerPathHandler('/url-test', { result: '<html><body><p>success</p></body></html>' });
        await newTab(freshtabUrl, { focus: true });
        await blurUrlBar();
        await mockSearch({ results: [{ url }] });
        withHistory([]);
        fillIn(query);
        await waitForPopup(1, 1000);
      });

      it('on Enter doesn\'t render last query box', async function () {
        press({ key: 'Enter' });
        await sleep(1000);
        const lastQueryBox = await urlbar.lastQuery;
        expect(lastQueryBox).to.have.property('visible').that.equal(false);
        expect(lastQueryBox).to.have.property('text').that.equal(null);
      });
    });
  });
}
