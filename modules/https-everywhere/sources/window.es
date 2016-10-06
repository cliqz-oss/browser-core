Cu.import("resource://gre/modules/AddonManager.jsm");

import utils from "core/utils";

export default class {
  constructor(config) {
    this.config = config;
  }

  init() {
  }

  unload() {
  }

  status() {
    return new Promise((resolve, reject) => {
      if(this.config.settings.channel == '40'){ //browser
        AddonManager.getAddonByID("https-everywhere@cliqz.com", function(addon){
          if(addon && addon.isActive){
            resolve({
              visible: true,
              active: utils.getPref('extensions.https_everywhere.globalEnabled', false, '')
            });
          } else {
            resolve({});
          }
        });
      } else {
        resolve({});
      }
    });
  }
}
