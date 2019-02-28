import {
  app,
  expect,
  prefs,
  testServer,
  waitFor,
} from '../../core/integration/helpers';

import getDexie from '../../../platform/lib/dexie';

const stagingUrlOriginal = app.config.settings.ANOLYSIS_STAGING_BACKEND_URL;

async function mockAnolysisBackend(
  {
    ping = 'healthy',
    newInstall = '{}',
    reappearingUser = '{}',
    activeUser = '{}',
    collect = '{}',
    updateGid = '{}',
  } = {},
  stagingUrl = testServer.getBaseUrl(),
) {
  app.config.settings.ANOLYSIS_STAGING_BACKEND_URL = stagingUrl;
  await Promise.all([
    testServer.registerPathHandler('/ping', { result: ping }),
    testServer.registerPathHandler('/new_install', { result: newInstall }),
    testServer.registerPathHandler('/reappearing_user', { result: reappearingUser }),
    testServer.registerPathHandler('/active_user', { result: activeUser }),
    testServer.registerPathHandler('/update_gid', { result: updateGid }),
    testServer.registerPathHandler('/collect', { result: collect }),
  ]);

  const Anolysis = app.modules.anolysis.background;
  Anolysis.unload();
  await Anolysis.init();
}

async function unMockAnolysisBackend() {
  app.config.settings.ANOLYSIS_STAGING_BACKEND_URL = stagingUrlOriginal;
  const Anolysis = app.modules.anolysis.background;
  Anolysis.unload();
  await Anolysis.init();
  await testServer.reset();
}

export default function () {
  const Anolysis = app.modules.anolysis.background;
  const reloadAnolysis = async () => {
    Anolysis.unload();
    await Anolysis.init();
  };

  context('health check', function () {
    context('config_ts is set', function () {
      it('anolysis starts', async () => {
        await reloadAnolysis();
        expect(Anolysis.isAnolysisInitialized()).to.be.true;
      });
    });

    context('config_ts is not set', function () {
      let configTs = null;

      beforeEach(async () => {
        // Remove config_ts
        configTs = prefs.get('config_ts');
        prefs.clear('config_ts');

        await reloadAnolysis();
      });

      afterEach(async () => {
        // Restore config_ts
        prefs.set('config_ts', configTs);
        await reloadAnolysis();
      });

      it('anolysis does not start', async () => {
        expect(Anolysis.isAnolysisInitialized()).to.be.false;
      });
    });

    context('storage is broken', function () {
      beforeEach(async () => {
        await mockAnolysisBackend();

        // Break Dexie (Yay!)
        const Dexie = await getDexie();
        await Dexie.delete('anolysis');
        const db = new Dexie('anolysis');
        db.version(1000000).stores({
          extra: '[foo+bar]',
        });
        await db.open();
        db.close();

        await reloadAnolysis();
      });

      afterEach(async () => {
        await unMockAnolysisBackend();

        // Fix storage
        const Dexie = await getDexie();
        await Dexie.delete('anolysis');

        await reloadAnolysis();
      });

      it('anolysis does not start', async () => {
        expect(Anolysis.isAnolysisInitialized()).to.be.false;

        await waitFor(async () => {
          const hasHits = await testServer.hasHit('/collect');
          if (hasHits) {
            const collectHits = (await testServer.getHits()).get('/collect');
            return (
              collectHits.some(({ body }) => body.type === 'metrics.anolysis.health.exception')
              && collectHits.some(({ body }) => body.type === 'metrics.anolysis.health.storage')
            );
          }
          return false;
        });
      });
    });

    context('gid cannot be updated', function () {
      beforeEach(async () => {
        await mockAnolysisBackend();

        // Fake throwing `_getGID` from gidManager
        Anolysis.anolysis.gidManager._getGID = () => { throw new Error('Random error'); };
        Anolysis.anolysis.gidManager.getGIDPromise = null;

        // Speed-up signalQueue
        Anolysis.anolysis.unload();
        Anolysis.anolysis.signalQueue.sendInterval = 10;
        await Anolysis.anolysis.init();

        // Provoke a failing `_getGID`
        Anolysis.anolysis.gidManager.getGID();
      });

      afterEach(async () => {
        await unMockAnolysisBackend();
      });

      it('health metric is emitted', async () => {
        await waitFor(async () => {
          const hasHits = await testServer.hasHit('/collect');
          if (hasHits) {
            const collectHits = (await testServer.getHits()).get('/collect');
            return collectHits.some(({ body }) => body.type === 'metrics.anolysis.health.exception');
          }
          return false;
        });
      });
    });
  });
}
