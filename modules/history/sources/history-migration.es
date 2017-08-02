import History from '../platform/history/history';
import prefs from '../core/prefs';
import utils from '../core/utils';

const MIGRATION_PREF = 'modules.history.migrationVersion';

export default function () {
  const migrationVersion = prefs.get(MIGRATION_PREF, 0);
  const migrationTimeout = utils.setTimeout(() => {
    History.migrate(migrationVersion).then(
      () => prefs.set(MIGRATION_PREF, migrationVersion + 1)
    );
  }, 10 * 1000);

  return {
    dispose() {
      utils.clearTimeout(migrationTimeout);
    },
  };
}
