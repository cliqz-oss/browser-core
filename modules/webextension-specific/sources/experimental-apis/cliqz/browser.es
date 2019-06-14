/* global windowTracker, MigrationUtils, ChromeUtils, Components */
const { ExtensionCommon } = ChromeUtils.import('resource://gre/modules/ExtensionCommon.jsm');

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

export function openPageActionPopup(extensionId) {
  const CLIQZ_ACTION_ID = ExtensionCommon.makeWidgetId(extensionId);
  const win = windowTracker.getCurrentWindow();
  const pageActionNode = win.BrowserPageActions.urlbarButtonNodeForActionID(CLIQZ_ACTION_ID);

  if (pageActionNode && win.BrowserPageActions.actionForNode(pageActionNode)) {
    pageActionNode.click();
  }
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
