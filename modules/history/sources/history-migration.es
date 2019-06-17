import History from '../platform/history/history';
import prefs from '../core/prefs';
import pacemaker from '../core/services/pacemaker';

const MIGRATION_PREF = 'modules.history.migrationVersion';

export default function () {
  const migrationVersion = prefs.get(MIGRATION_PREF, 0);
  const migrationTimeout = pacemaker.setTimeout(() => {
    History.migrate(migrationVersion).then(
      () => prefs.set(MIGRATION_PREF, migrationVersion + 1)
    );
  }, 10 * 1000);

  return {
    dispose() {
      pacemaker.clearTimeout(migrationTimeout);
    },
  };
}
