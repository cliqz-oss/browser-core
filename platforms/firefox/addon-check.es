Cu.import("resource://gre/modules/AddonManager.jsm");

const genericPrefs = Components.classes['@mozilla.org/preferences-service;1']
        .getService(Components.interfaces.nsIPrefBranch);

const similarAddonNames = {
  "Adblock Plus": true,
  "Ghostery": true,
  "Lightbeam": true,
  "Disconnect": true,
  "BetterPrivacy": true,
  "NoScript": true
}

/**
 * Gets an indicator of the privacy addons installed on this profile.
 * @return {Promise.<String,Boolean>} if just one of the shortlisted addons
 * is installed, returns its name. if two or more are installed, returns true
 * otherwise, returns false.
 */
export function checkInstalledPrivacyAddons() {
  return auditInstalledAddons().then((addons) => {
    const privacyAddons = addons.filter((a) => a.name in similarAddonNames);
    if(privacyAddons.length === 0) {
      return privacyAddons[0].name;
    } else {
      return privacyAddons.length > 1;
    }
  });
}

/**
 * Get a list of installed and active extensions for this browser.
 * @return {Promise.<Array>} Promise resolves to an array of objects,
 * each with the id and name of an extension
 */
export function auditInstalledAddons() {
  return new Promise((resolve) => {
    AddonManager.getAddonsByTypes(['extension'], (addons) => resolve(addons))
  }).then((addons) => {
    return addons.filter(addon => addon.isActive).map(addon => ({
      id: addon.id,
      name: addon.name,
    }));
  });
}
