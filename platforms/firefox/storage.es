import { Components, Services } from './globals';
/*
 * In Firefox this method will return undefined is called too early in
 * browser lifecycle. On some older versions like 2x it may even crash
 * entire process.
 */
export default function (url = 'chrome://cliqz/content/') {
  const uri = Services.io.newURI(url, '', null);
  const ssm = Components.classes['@mozilla.org/scriptsecuritymanager;1']
    .getService(Components.interfaces.nsIScriptSecurityManager);

  const principal = ssm.createCodebasePrincipal(uri, {});

  const dsm = Components.classes['@mozilla.org/dom/localStorage-manager;1']
    .getService(Components.interfaces.nsIDOMStorageManager);

  if (dsm.getLocalStorageForPrincipal) {
    return dsm.getLocalStorageForPrincipal(principal, '');
  }
  // FF57 +
  const win = Components.classes['@mozilla.org/appshell/window-mediator;1']
    .getService(Components.interfaces.nsIWindowMediator)
    .getMostRecentWindow('navigator:browser');

  return dsm.createStorage(win, principal, '');
}
