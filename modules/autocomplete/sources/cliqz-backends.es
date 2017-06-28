/*
 * This module handles the different country-specific search backends
 * cliqz provides
 *
 */

import utils from "../core/utils";
import console from "../core/console";


class CliqzSearchCountryProviders {
  constructor() {}

  getProviders() {
    let available = JSON.parse(utils.getPref('config_backends', '["de"]'));

    return available.reduce(function(acc, cur) {
      acc[cur] = {
        'selected': cur === utils.getPref('backend_country', 'de'),
        'name': utils.getLocalizedString('country_code_' + cur.toUpperCase())
      }

      return acc;
    }, {});
  }
}

export default CliqzSearchCountryProviders;
