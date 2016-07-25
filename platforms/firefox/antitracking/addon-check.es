Cu.import("resource://gre/modules/AddonManager.jsm");

var genericPrefs = Components.classes['@mozilla.org/preferences-service;1']
        .getService(Components.interfaces.nsIPrefBranch);

var similarAddonNames = {
  "Adblock Plus": true,
  "Ghostery": true,
  "Lightbeam": true,
  "Disconnect": true,
  "BetterPrivacy": true,
  "NoScript": true
}

export function checkInstalledAddons() {
  var similarAddon = false;
  if (genericPrefs.prefHasUserValue('network.cookie.cookieBehavior')) {
      similarAddon = 'Firefox';
  }
  AddonManager.getAllAddons(function(aAddons) {
    aAddons.forEach(function(a) {
      if (a.isActive === true && a.name in similarAddonNames){
        if (similarAddon == false) {
          similarAddon = a.name;
        } else {
          similarAddon = true;
        }
      }
    });
  });
  return similarAddon;
};
