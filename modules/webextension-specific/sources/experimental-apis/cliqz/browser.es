/* global windowTracker, MigrationUtils */

export function openImportDialog() {
  if (typeof MigrationUtils === 'undefined') {
    try {
      Components.utils.import('resource:///modules/MigrationUtils.jsm');
    } catch (e) {
      return;
    }
  }
  const win = windowTracker.getCurrentWindow();
  MigrationUtils.showMigrationWizard(win, [MigrationUtils.MIGRATION_ENTRYPOINT_PLACES]);
}

export function isDefaultBrowser() {
  try {
    const shell = Components.classes['@mozilla.org/browser/shell-service;1']
      .getService(Components.interfaces.nsIShellService);
    if (shell) {
      return shell.isDefaultBrowser(false);
    }
  } catch (e) {
    // empty
  }

  return null;
}
