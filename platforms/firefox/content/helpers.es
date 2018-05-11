/* eslint-disable */
export function getWindowId(window) {
  return window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
    .getInterface(Components.interfaces.nsIDOMWindowUtils).outerWindowID;
}
/* eslint-enable */
