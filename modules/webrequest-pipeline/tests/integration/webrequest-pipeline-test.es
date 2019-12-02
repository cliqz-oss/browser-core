/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { app, expect, newTab, updateTab, getTab, testServer, waitFor } from '../../../tests/core/integration/helpers';
import { isChromium } from '../../../core/platform';

export default () => {
  describe('WebrequestPipeline tests', () => {
    const magic = `${Date.now()}`;
    const getSuffix = (path = 'base') => `/${magic}_${path}`;
    const getUrl = (path = 'base') => testServer.getBaseUrl(getSuffix(path));

    let details;
    const pipeline = app.modules['webrequest-pipeline'].background;
    let addPipeline;

    const openTab = async (url) => {
      const tabId = await newTab('about:blank');
      await waitFor(() => pipeline.pageStore.tabs.has(tabId), 2000);
      updateTab(tabId, { url });
      await waitFor(async () => (await getTab(tabId)).url !== 'about:blank', 2000);
      return tabId;
    };

    const collectRequestDetails = (ctx) => {
      if (ctx.url.includes(magic) && !ctx.url.includes('favicon.ico')) {
        details.push(ctx);
      }
    };

    beforeEach(async () => {
      details = [];

      // Reload pipeline
      pipeline.unload();
      await pipeline.init();

      addPipeline = cb => pipeline.actions.addPipelineStep('onBeforeRequest', {
        name: 'test',
        spec: 'blocking',
        fn: cb,
      });
    });

    afterEach(() => pipeline.actions.removePipelineStep(
      'onBeforeRequest',
      'test',
    ));

    describe('details', () => {
      it('main_frame', async () => {
        addPipeline(collectRequestDetails);
        await testServer.registerPathHandler(getSuffix(), { result: '<html>foo</html>' });
        await openTab(getUrl());
        await waitFor(() => {
          expect(details).to.have.length(1);
          expect(details[0]).to.deep.include({
            frameAncestors: [],
            frameId: 0,
            url: getUrl(),
            frameUrl: getUrl(),
            tabUrl: getUrl(),
            isMainFrame: true,
            isPrivate: false,
            isRedirect: false,
            method: 'GET',
            parentFrameId: -1,
            type: 'main_frame',
          });
          return true;
        });
      }, 10000);

      it('sub_frame', async () => {
        addPipeline(collectRequestDetails);
        await Promise.all([
          testServer.registerPathHandler(getSuffix('iframe'), { result: '<html>hello</html>' }),
          testServer.registerPathHandler(getSuffix(), {
            result: `<html><iframe src="${getUrl('iframe')}"></html>`,
          }),
        ]);
        await openTab(getUrl());
        await waitFor(() => {
          expect(details).to.have.length(2);

          // main_frame
          expect(details[0]).to.deep.include({
            frameAncestors: [],
            frameId: 0,
            url: getUrl(),
            frameUrl: getUrl(),
            tabUrl: getUrl(),
            isMainFrame: true,
            isPrivate: false,
            isRedirect: false,
            method: 'GET',
            parentFrameId: -1,
            type: 'main_frame',
          });

          // sub_frame
          expect(details[1].frameId).to.not.eql(0);
          expect(details[1]).to.deep.include({
            frameAncestors: [{ frameId: 0, url: getUrl() }],
            // frameId: 0,
            url: getUrl('iframe'),
            frameUrl: getUrl('iframe'),
            tabUrl: getUrl(),
            isMainFrame: false,
            isPrivate: false,
            isRedirect: false,
            method: 'GET',
            parentFrameId: 0,
            type: 'sub_frame',
          });

          return true;
        }, 10000);
      });
    });

    it('Redirecting', async () => {
      // In this case we simulate the following flow:
      // 1. load / which is redirected to /js via webRequest answer
      // 2. /js redirects to /302
      // 2. /302 redirects to /303
      // 3. /303 redirects to /target
      const body = '<html><body></body></html>';

      await addPipeline((ctx, response) => {
        collectRequestDetails(ctx);
        if (ctx.url === getUrl()) {
          response.redirectTo(getUrl('js'));
        }
      });

      await Promise.all([
        testServer.registerPathHandler(getSuffix(), {
          result: body,
        }),
        testServer.registerPathHandler(getSuffix('js'), {
          result: `<html><body><script>window.location="${getUrl('302')}"</script></body></html>`,
        }),
        testServer.registerPathHandler(getSuffix('302'), {
          result: body,
          headers: [{ name: 'Location', value: getUrl('303') }],
          status: '302',
        }),
        testServer.registerPathHandler(getSuffix('303'), {
          result: body,
          headers: [{ name: 'Location', value: getUrl('target') }],
          status: '303',
        }),
        testServer.registerPathHandler(getSuffix('target'), { result: body }),
      ]);
      await openTab(getUrl());
      await waitFor(() => {
        expect(details).to.have.length(5);
        return true;
      }, 10000);

      // starting point, which should be redirected via webrequest answer
      expect(details[0], '/').to.deep.include({
        frameAncestors: [],
        frameId: 0,
        url: getUrl(),
        frameUrl: getUrl(),
        tabUrl: getUrl(),
        isMainFrame: true,
        isPrivate: false,
        isRedirect: false,
        method: 'GET',
        parentFrameId: -1,
        type: 'main_frame',
      });

      // /js
      expect(details[1], '/js').to.deep.include({
        frameAncestors: [],
        frameId: 0,
        url: getUrl('js'),
        frameUrl: getUrl('js'),
        tabUrl: getUrl('js'),
        isMainFrame: true,
        isPrivate: false,
        isRedirect: true,
        method: 'GET',
        parentFrameId: -1,
        type: 'main_frame',
      });

      // /302
      expect(details[2], '/302').to.deep.include({
        frameAncestors: [],
        frameId: 0,
        url: getUrl('302'),
        frameUrl: getUrl('302'),
        tabUrl: getUrl('302'),
        isMainFrame: true,
        isPrivate: false,
        isRedirect: false,
        method: 'GET',
        parentFrameId: -1,
        type: 'main_frame',
      });

      // /303
      expect(details[3], '/303').to.deep.include({
        frameAncestors: [],
        frameId: 0,
        url: getUrl('303'),
        frameUrl: getUrl('303'),
        tabUrl: getUrl('303'),
        isMainFrame: true,
        isPrivate: false,
        isRedirect: true,
        method: 'GET',
        parentFrameId: -1,
        type: 'main_frame',
      });

      // /target
      expect(details[4], '/target').to.deep.include({
        frameAncestors: [],
        frameId: 0,
        url: getUrl('target'),
        frameUrl: getUrl('target'),
        tabUrl: getUrl('target'),
        isMainFrame: true,
        isPrivate: false,
        isRedirect: true,
        method: 'GET',
        parentFrameId: -1,
        type: 'main_frame',
      });
    });

    if (!isChromium) {
      // This test is not run in chrome because it the unload event does not trigger the requests
      // when a cross-origin navigation is made. This then only works for the iframe test.
      it('Beacon', async () => {
        await addPipeline((ctx) => {
          collectRequestDetails(ctx);
        });

        await Promise.all([
          testServer.registerPathHandler(getSuffix(), {
            result: `<html><body><script>
              navigator.sendBeacon('${getSuffix('beacon')}', 'foo');
              window.addEventListener('unload', () => {
                var client = new XMLHttpRequest();
                client.open('GET', '${getSuffix('beacon')}', false);
                client.send(null);
                navigator.sendBeacon('${getSuffix('beacon')}', 'bar');
              }, false);
            </script></body></html>`,
          }),
          testServer.registerPathHandler(getSuffix('beacon'), {
            result: '{}',
          }),
          testServer.registerPathHandler(getSuffix('ready'), {
            result: '{}',
          }),
          testServer.registerPathHandler(getSuffix('landing'), {
            result: `<html><body><script>
              window.addEventListener('load', () => fetch('${getSuffix('ready')}'))
            </script></body></html>`,
          }),
        ]);
        const filterBeacons = r => r.url.endsWith('beacon');

        // open a page and wait for the 'ready' beacon
        const tabId = await openTab(getUrl('landing'));
        await waitFor(() => details.filter(r => r.url.endsWith('ready').length === 1), 1000);
        // switch to the test page and wait for the first beacon to trigger
        updateTab(tabId, { url: getUrl() });
        await waitFor(() => details.filter(filterBeacons).length >= 1, 1000);
        // go back to the other page and wait for the beacons on page unload
        updateTab(tabId, { url: getUrl('landing') });
        await waitFor(() => details.filter(filterBeacons).length >= 3, 10000);

        const beacons = details.filter(filterBeacons);
        expect(beacons).to.have.length(3);
        beacons.forEach((req) => {
          expect(req).to.deep.include({
            tabUrl: getUrl(),
          });
        });
      });
    }

    it('Beacon in iframe', async () => {
      await addPipeline((ctx) => {
        collectRequestDetails(ctx);
      });

      await Promise.all([
        testServer.registerPathHandler(getSuffix(), {
          result: `<html><body><iframe src="${getSuffix('frame')}"></iframe></body></html>`,
        }),
        testServer.registerPathHandler(getSuffix('frame'), {
          result: `<html><body><script>
            navigator.sendBeacon('${getSuffix('beacon')}', 'foo');
            window.addEventListener('unload', () => {
              navigator.sendBeacon('${getSuffix('beacon')}', 'bar');
              var client = new XMLHttpRequest();
              client.open('GET', '${getSuffix('beacon')}', ${isChromium ? 'true' : 'false'});
              client.send(null);
            }, false);
          </script></body></html>`
        }),
        testServer.registerPathHandler(getSuffix('beacon'), {
          result: '{}',
        }),
        testServer.registerPathHandler(getSuffix('ready'), {
          result: '{}',
        }),
        testServer.registerPathHandler(getSuffix('landing'), {
          result: `<html><body><script>
            window.addEventListener('load', () => fetch('${getSuffix('ready')}'))
          </script></body></html>`,
        }),
      ]);
      const filterBeacons = r => r.url.endsWith('beacon');

      // open a page and wait for the 'ready' beacon
      const tabId = await openTab(getUrl('landing'));
      await waitFor(() => details.filter(r => r.url.endsWith('ready').length === 1), 1000);
      // switch to the test page and wait for the first beacon to trigger
      updateTab(tabId, { url: getUrl() });
      await waitFor(() => details.filter(filterBeacons).length >= 1, 1000);
      // go to a new page on a different origin and wait for the beacons on page unload
      updateTab(tabId, { url: 'http://example.com' });
      await waitFor(() => details.filter(filterBeacons).length >= 3, 10000);
      const beacons = details.filter(filterBeacons);
      expect(beacons).to.have.length(3);
      beacons.forEach((req) => {
        expect(req).to.deep.include({
          tabUrl: getUrl(),
        });
      });
    });

    if (!isChromium) {
      describe('Service workers', () => {
        const testScope = 'swtests';

        function setupServiceWorker() {
          return Promise.all([
            testServer.registerPathHandler(getSuffix(`${testScope}/service-worker-test.html`), {
              result: `<!DOCTYPE html>
              <html>
                <body>
                  <p>Service worker</p>
                  <script src="./index.js"></script>
                </body>
              </html>`,
            }),
            testServer.registerPathHandler(getSuffix(`${testScope}/index.js`), {
              result: `
              navigator.serviceWorker.register("./sw.js", {
                scope: './',
              });
              `
            }),
            testServer.registerPathHandler(getSuffix(`${testScope}/ping`), {
              result: '{}'
            }),
            testServer.registerPathHandler(getSuffix(`${testScope}/sw.js`), {
              result: `
              self.addEventListener('fetch', function(event) {
                if (new URL(event.request.url).pathname.endsWith('service-worker-from-cache.html')) {
                  console.log('response from cache');
                  fetch('./ping');
                  event.respondWith(new Response("<html><body><p>Cached</p><script>fetch('./ping')</script><body></html>", { status: 200, headers: {"content-type": "text/html"}}));
                  return;
                }
                event.respondWith(fetch(event.request));
              });
              `
            }),
          ]);
        }

        const filterPings = r => r.url.endsWith('ping') && r.tabId > 0;

        it('correct tabUrl when page load intercepted by service worker', async () => {
          await setupServiceWorker();
          addPipeline(collectRequestDetails);
          // setup: load landing page to trigger SW-install and wait for it to be loaded
          const tabId = await newTab(getUrl(`${testScope}/service-worker-test.html`));
          await waitFor(() => details.some(d => d.url.indexOf('sw.js') !== -1), 30000);
          await new Promise(resolve => setTimeout(resolve, 2000));
          details = [];
          // Switch url: this request is served from the service-worker.
          // Then wait for the request triggered from the cached document.
          updateTab(tabId, { url: getUrl(`${testScope}/service-worker-from-cache.html`) });
          await waitFor(() => details.filter(filterPings).length >= 1, 30000);
          details.filter(filterPings).forEach((r) => {
            expect(r.tabUrl).to.equal(getUrl(`${testScope}/service-worker-from-cache.html`), 'tabUrl should match SW-served document');
          });
        });
      });
    }
  });
};
