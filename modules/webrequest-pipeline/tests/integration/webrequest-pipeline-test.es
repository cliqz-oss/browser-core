import { app, expect, newTab, updateTab, getTab, testServer, waitFor } from '../../../tests/core/integration/helpers';

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

      addPipeline((ctx, response) => {
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
          isRedirect: true,
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

        return true;
      }, 10000);
    });
  });
};
