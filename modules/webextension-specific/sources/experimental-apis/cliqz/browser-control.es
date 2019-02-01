/* global windowTracker, MigrationUtils */
Components.utils.import('resource:///modules/MigrationUtils.jsm');

export default function openImportDialog() {
  const win = windowTracker.getCurrentWindow();
  MigrationUtils.showMigrationWizard(win, [MigrationUtils.MIGRATION_ENTRYPOINT_PLACES]);
}
