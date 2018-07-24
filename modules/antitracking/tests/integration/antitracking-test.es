import {
  app,
  checkIsWindowActive,
  closeTab,
  expect,
  newTab,
  testServer,
  updateTab,
  waitFor,
  waitForAsync
} from '../../../tests/core/test-helpers';

import Config from '../../../antitracking/config';
import pacemaker from '../../../core/pacemaker';


export default function () {
  before(() => {
    // pause pacemaker to prevent external list updates
    pacemaker.stop();
  });

  after(() => {
    // restart pacemaker
    pacemaker.start();
  });


  let attrack;
  let webRequestPipeline;

  beforeEach(async () => {
    attrack = app.modules.antitracking.background.attrack;
    webRequestPipeline = app.modules['webrequest-pipeline'].background;

    // Try to mock app
    webRequestPipeline.unload();
    await webRequestPipeline.init({});

    attrack.unload();
    await attrack.init(new Config({}));
  });


  describe('platform/browser', () => {
    describe('#checkIsWindowActive', () => {
      it('returns false for none existant tab ids', async () => {
        expect(await checkIsWindowActive(-1)).to.be.false;
        expect(await checkIsWindowActive(0)).to.be.false;
        expect(await checkIsWindowActive(532)).to.be.false;
      });

      describe('when tab is opened', () => {
        let tabId;

        beforeEach(async () => {
          attrack.tp_events._active = {};
          await testServer.registerPathHandler('/', '<html><body><p>Hello world</p></body></html');
          tabId = await newTab(testServer.getBaseUrl());
        });

        it('returns true for open tab id', async () => {
          expect(await checkIsWindowActive(tabId)).to.be.true;
        });

        describe('when tab is closed', () => {
          it('returns false for closed tab id', async () => {
            await closeTab(tabId);
            expect(await checkIsWindowActive(tabId)).to.be.false;
          });
        });
      });
    });
  });


  describe('attrack.tp_events', () => {
    describe('Integration', () => {
      let tabs = [];

      beforeEach(async () => {
        await attrack.tp_events.commit(true);
        attrack.tp_events._staged = [];
        // prevent data push during the test
        attrack._last_push = (new Date()).getTime();
      });

      afterEach(async () => {
        await Promise.all(tabs.map(tabId => closeTab(tabId)));
        tabs = [];
      });

      it('should initially have no active tabs', () => {
        expect(attrack.tp_events._active).to.be.empty;
      });

      describe('when tabs are opened', () => {
        let tabId = 0;
        tabs = [];
        let pageLoad;

        beforeEach(async () => {
          await Promise.all([
            testServer.registerPathHandler('/', '<html><body><p>Hello world</p></body></html'),
            testServer.registerPathHandler('/privacy', '<html><body><p>Hello private world</p></body></html'),
          ]);
          tabs.push(await newTab(testServer.getBaseUrl()));
          tabs.push(await newTab(testServer.getBaseUrl('privacy#saferWeb')));
        });

        it('should add tabs to _active', async () => {
          await waitFor(() => Object.keys(attrack.tp_events._active).length === 2);
          expect(Object.keys(attrack.tp_events._active)).to.have.length(2);
          tabId = Object.keys(attrack.tp_events._active)[0];
          pageLoad = attrack.tp_events._active[tabId];
          expect(pageLoad).to.include.keys('hostname', 'url', 'path');
          expect(pageLoad.url.replace(/\/$/, '')).to.equal(testServer.getBaseUrl());
          expect(pageLoad.hostname).to.equal('localhost');
          // md5('/')
          expect(pageLoad.path).to.equal('6666cd76f96956469e7be39d750cc7d9'.substring(0, 16));
          expect(pageLoad.tps).to.be.empty;
        });

        describe('when a tab is closed', () => {
          beforeEach(async () => {
            await waitFor(() => Object.keys(attrack.tp_events._active).length === 2);
            await closeTab(tabs.shift());
            await attrack.tp_events.commit(true);
          });

          xdescribe('attrack.tp_events.commit', () => {
            it('should stage closed tabs only', () => {
              expect(Object.keys(attrack.tp_events._active)).to.have.length(1);
              // check staged tab
              if (attrack.tp_events._staged.length > 1) {
                throw attrack.tp_events._staged.map(s => s.url);
              }
              expect(attrack.tp_events._staged).to.have.length(1);
              expect(attrack.tp_events._staged[0].url).to.equal(testServer.getBaseUrl());

              // check active tab
              tabId = Object.keys(attrack.tp_events._active)[0];
              expect(attrack.tp_events._active[tabId].url).to.equal(testServer.getBaseUrl('privacy#saferWeb'));
            });
          });
        });

        xdescribe('when new page is loaded in existing tab', () => {
          const newUrl = `http://cliqztest.de:${testServer.port}/`;
          beforeEach(() => updateTab(tabs[0], newUrl));

          describe('attrack.tp_events.commit', () => {
            it('should stage previous page load', async () => {
              await waitForAsync(async () => {
                await attrack.tp_events.commit(true);
                return attrack.tp_events._staged.length > 0;
              });

              // still have 2 active tabs
              expect(Object.keys(attrack.tp_events._active)).to.have.length(2);
              // check staged tab
              if (attrack.tp_events._staged.length > 1) {
                const urls = attrack.tp_events._staged.map(function (s) { return s.url; });
                throw urls;
              }
              expect(attrack.tp_events._staged).to.have.length(1);
              expect(attrack.tp_events._staged[0].url).to.equal(testServer.getBaseUrl());

              // check active tabs
              const tabUrls = Object.keys(attrack.tp_events._active).map(function (_tabId) {
                return attrack.tp_events._active[_tabId].url;
              });
              expect(tabUrls).to.not.contain(testServer.getBaseUrl());
              expect(tabUrls).to.contain(testServer.getBaseUrl('privacy#saferWeb'));
            });
          });
        });
      });

      describe('redirects', () => {
        // hit_target TODO

        beforeEach(() => {
          const body = '<html><body></body></html>';
          const jsBody = `<html><body><script>window.location="http://cliqztest.com:${testServer.port}/target"</script></body></html>`;
          // 302 redirect case
          return Promise.all([
            testServer.registerPathHandler('/302', body, [{ name: 'Location', value: `http://cliqztest.com:${testServer.port}/target` }], '302'),
            testServer.registerPathHandler('/303', body, [{ name: 'Location', value: `http://cliqztest.com:${testServer.port}/target` }], '303'),
            testServer.registerPathHandler('/js', jsBody),
            testServer.registerPathHandler('/target', body),
          ]);
        });

        ['302', '303'/* 'js' */].forEach((kind) => {
          describe(kind, () => {
            beforeEach(async () => {
              tabs.push(await newTab(testServer.getBaseUrl(kind)));
            });

            it('gets host at end of redirect chain', async () => {
              await waitForAsync(() => testServer.hasHit('/target'));
              // for js redirect the hit comes before webrequest is triggered.
              // we wait a short time to allow for the webrequest event to update tp_events
              if (kind === 'js') {
                await new Promise(r => setTimeout(r, 100));
              }
              await attrack.tp_events.commit(true);

              const hits = await testServer.getHits();
              console.error('HITS', hits);
              expect(hits.get(`/${kind}`)).to.have.length(1);
              expect(Object.keys(attrack.tp_events._active)).to.have.length(1);
              const tabid = Object.keys(attrack.tp_events._active)[0];
              expect(attrack.tp_events._active[tabid].hostname).to.equal('cliqztest.com');

              if (kind !== 'js') {
                // check original is in redirect chain
                expect(attrack.tp_events._active[tabid].redirects).to.have.length(1);
                expect(attrack.tp_events._active[tabid].redirects[0]).to.equal('localhost');
              }
            });
          });
        });
      });
    });
  });
}
