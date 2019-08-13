import prefs from '../prefs';
import console from '../console';
import config from '../config';

const MIGRATION_VERSION_PREF = 'migrationVersion';
/**
 * IMPORTANT: always add migrations at the end of MIGRATIONS array
 */
const MIGRATIONS = [
  () => prefs.clear('historyLookupEnabled'),
  () => prefs.clear('modules.dropdown.enabled'),
  // remove prefs default values from storage - default value should be
  // fetched from config on every call to prefs.get
  () => Object.keys(config.default_prefs).forEach((key) => {
    const value = prefs.get(key);
    if (value === config.default_prefs[key]) {
      prefs.clear(key);
    }
  }),
  // Import `extensions.cliqz.full_distribution` pref from Firefox prefs (see: EX-9174)
  () => {
    const distribution = prefs.get('full_distribution', null, 'extensions.cliqz.');
    if (distribution !== null) {
      prefs.set('full_distribution', distribution);
    }
  }
];

/**
 * Migrations will be executed one by one starting from the
 * begining of MIGRATIONS array.
 * If any migration fail, no future migrations will be run,
 * but App will continue to run.
 * Index of last run migration is saved so on next startup we
 * wont rerun migrations.
 */
export default async function migrate() {
  let version = Number(prefs.get(MIGRATION_VERSION_PREF, 0));
  console.log('App', `Migration started with version ${version}`);
  try {
    while (version < MIGRATIONS.length) {
      const migration = MIGRATIONS[version];
      // eslint-disable-next-line no-await-in-loop
      await migration();
      version += 1;
    }
  } catch (e) {
    console.error('App', `Migration #${version + 1} failed`, e);
  } finally {
    console.log('App', `Migration finished with version ${version}`);
    prefs.set(MIGRATION_VERSION_PREF, version);
  }
}
