/*
 * This module handles the different country-specific search backends
 * cliqz provides 
 *
 */

import utils from "core/utils";
import console from "core/console";

var LOG_KEY = 'CliqzBackends.jsm';


class CliqzSearchCountryProviders {
  constructor() {
    console.log('CliqzSearchCountryProviders initialized', LOG_KEY);
    //this.supportedIndexCountries = this.getProviders();
  }

  getProviders() {
    var supportedIndexCountries = JSON.parse(utils.getPref('config_backends', '["de"]'));
    return supportedIndexCountries.map(function(c) { return {'iso': c, 
               'selected': c === utils.getPref('backend_country', 'de'),
               'label_key': 'country_code_' + c.toUpperCase()
             }}
            );

  }
}

export default CliqzSearchCountryProviders;