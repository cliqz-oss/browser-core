/*
 * In Firefox this method will return undefined is called too early in
 * browser lifecycle. On some older versions like 2x it may even crash
 * entire process.
 */
export default function (url) {
  const uri = Services.io.newURI(url, '', null);
  const principalFunction = Components.classes['@mozilla.org/scriptsecuritymanager;1']
    .getService(Components.interfaces.nsIScriptSecurityManager)
    .getNoAppCodebasePrincipal;

  // TODO: need proper comment
  if (typeof principalFunction !== 'function') {
    return undefined;
  }

  const principal = principalFunction(uri);
  const dsm = Components.classes['@mozilla.org/dom/localStorage-manager;1']
    .getService(Components.interfaces.nsIDOMStorageManager);

  return dsm.getLocalStorageForPrincipal(principal, '');
}
