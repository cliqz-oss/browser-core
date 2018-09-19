import Signals from './signals';
import { Components, XPCOMUtils, Services } from '../platform/globals';

function AboutURLPrivacy() {}
let AboutURLFactoryPrivacy;

const PrivacyRep = {
  openingStreamCount: 0,

  onExtensionStart() {
    Signals.init();
    Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);

    AboutURLPrivacy.prototype = {
      QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIAboutModule]),
      classDescription: 'about:transparency',
      classID: Components.ID('{abab0a50-7988-11e5-a837-0800200c9a66}'),
      contractID: '@mozilla.org/network/protocol/about;1?what=transparency',

      newChannel(aURI, aLoadInfo) {
        const html = `data:text/html,
          <script>
            var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
              .getService(Components.interfaces.nsIWindowMediator);
            var securityManager = Components.classes['@mozilla.org/scriptsecuritymanager;1']
              .getService(Components.interfaces.nsIScriptSecurityManager);
            var w = wm.getMostRecentWindow('navigator:browser');
            var url = 'chrome://cliqz/content/privacy-dashboard/index.html';
            w.gBrowser.addTab(url, {
              triggeringPrincipal: securityManager.getSystemPrincipal(),
            });
            window.close();
          </script>
        `;

        const uri = Services.io.newURI(html, null, null);
        const channel = Services.io.newChannelFromURIWithLoadInfo(uri, aLoadInfo);

        channel.originalURI = aURI;
        channel.owner = Services.scriptSecurityManager.getSystemPrincipal();

        return channel;
      },

      getURIFlags() {
        return Components.interfaces.nsIAboutModule.ALLOW_SCRIPT;
      }
    };

    AboutURLFactoryPrivacy = XPCOMUtils
      .generateNSGetFactory([AboutURLPrivacy])(AboutURLPrivacy.prototype.classID);

    Components.manager.registerFactory(
      AboutURLPrivacy.prototype.classID,
      AboutURLPrivacy.prototype.classDescription,
      AboutURLPrivacy.prototype.contractID,
      AboutURLFactoryPrivacy
    );
  },

  unload() {
    Components.manager.unregisterFactory(AboutURLPrivacy.prototype.classID, AboutURLFactoryPrivacy);
  },

  registerStream() {
    if (PrivacyRep.openingStreamCount === 0) {
      Signals.startListening();
    }

    PrivacyRep.openingStreamCount += 1;
    Signals.setStreaming(true);
  },

  unregisterStream() {
    PrivacyRep.openingStreamCount -= 1;
    if (PrivacyRep.openingStreamCount <= 0) {
      PrivacyRep.openingStreamCount = 0;
      Signals.setStreaming(false);
      Signals.stopListening();
    }
  },

  getCurrentData() {
    return Signals.getSignalsToDashboard();
  }
};

export default PrivacyRep;
