import background from '../core/base/background';
import prefs from '../core/prefs';
import UrlWhitelist from '../core/url-whitelist';
import getDexie from '../platform/lib/dexie';
import { remove } from '../platform/sqlite';
import { removeDir } from '../platform/fs';


async function cleanAntitrackingData() {
  // attrack dexie DB
  await getDexie().then((Dexie) => {
    const db = new Dexie('antitracking');
    return db.delete();
  });
  // attrack sqlite db
  remove('cliqz.dbattrack');
  await removeDir(['cliqz', 'antitracking']);
}

async function cleanAdblockerData() {
  await removeDir(['cliqz', 'adblocker']);
  await getDexie().then((Dexie) => {
    const db = new Dexie('cliqz-adb');
    return db.delete();
  });
}

export default background({
  init() {
  },

  unload() {
  },

  events: {},

  actions: {
    async exportSettings() {
      const settings = {
        antitracking: {
          enabled: prefs.get('modules.antitracking.enabled', true),
        },
        adblocker: {
          enabled: prefs.get('cliqz-adb') === 1,
        }
      };
      const antitrackingWhitelist = new UrlWhitelist('attrack-url-whitelist');
      const adblockerWhitelist = new UrlWhitelist('adb-blacklist');
      await Promise.all([antitrackingWhitelist.init(), adblockerWhitelist.init()]);

      settings.antitracking.whitelistedSites = [...antitrackingWhitelist.whitelist]
        .map(d => d.substring(2));
      // take just host whitelists from adblocker settings
      settings.adblocker.whitelistedSites = [...adblockerWhitelist.whitelist]
        .filter(s => s.startsWith('h:'))
        .map(d => d.substring(2));

      prefs.set('privacyMigration.exportState', 1);
      return settings;
    },

    async cleanModuleData() {
      await cleanAntitrackingData();
      await cleanAdblockerData();
      prefs.set('privacyMigration.exportState', 2);
    },
  },
});
