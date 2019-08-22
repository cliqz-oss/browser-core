/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* globals ChromeUtils, ExtensionAPI, Components */
const { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');

global.cliqzNativeBridge = class extends ExtensionAPI {
  getAPI() {
    return {
      cliqzNativeBridge: {
        callAction: (action, args) => {
          // TODO: implement promise based bridge with native
          let response;
          switch (action) {
            case 'getInstallDate':
              response = Services.prefs.getCharPref(
                'android.not_a_preference.browser.install.date',
                '16917'
              );
              break;
            default:
              Components.utils.reportError('[native-bridge] Action not supported', action, args);
          }
          return response;
        }
      }
    };
  }
};
