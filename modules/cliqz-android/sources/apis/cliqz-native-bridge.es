/* globals ChromeUtils, ExtensionAPI, Components */
const { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');

this.cliqzNativeBridge = class extends ExtensionAPI {
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
