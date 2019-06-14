/* globals AddonManager, Components */

Components.utils.import('resource://gre/modules/AddonManager.jsm');

function _getAddon(id) {
  return new Promise((resolve) => {
    const promise = AddonManager.getAddonByID(id, resolve);

    if (promise && promise.then) {
      promise.then(resolve);
    }
  });
}

export default function changeAddonState(id, state) {
  _getAddon(id).then((addon) => {
    if (state === true) {
      addon.enable();
    } else {
      addon.disable();
    }
  });
}
