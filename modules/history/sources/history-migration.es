import History from '../platform/history/history';
import prefs from '../core/prefs';

const MIGRATION_PREF = 'modules.history.migrationVersion';

export default function () {
  const migrationVersion = prefs.get(MIGRATION_PREF, 0);
  const migrationTimeout = setTimeout(() => {
    History.migrate(migrationVersion).then(
      () => prefs.set(MIGRATION_PREF, migrationVersion + 1)
    );
  }, 10 * 1000);

  return {
    dispose() {
      clearTimeout(migrationTimeout);
    },
  };
}
