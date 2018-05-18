import { getCurrentWindow } from '../browser';
import { Components } from '../globals';

export default function openImportDialog() {
  const win = getCurrentWindow();
  const MigrationUtils = Components.utils.import('resource:///modules/MigrationUtils.jsm', null).MigrationUtils;
  MigrationUtils.showMigrationWizard(win, [MigrationUtils.MIGRATION_ENTRYPOINT_PLACES]);
}
