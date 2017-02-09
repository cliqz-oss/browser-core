import utils from '../core/utils';
import { Components, Services, XPCOMUtils } from '../platform/globals';

export default class AboutCliqz {

  get classDescription() {
    return 'CLIQZ New Tab Page';
  }

  get contractID() {
    return '@mozilla.org/network/protocol/about;1?what=cliqz';
  }

  get classID() {
    /* eslint-disable */
    return Components.ID('{D5889F72-0F01-4aee-9B88-FEACC5038C34}');
    /* eslint-enable */
  }

  get QueryInterface() {
    return XPCOMUtils.generateQI([Components.interfaces.nsIAboutModule]);
  }

  newChannel(aURI, aLoadInfo) {
    /* all this is plain bad, please fix me */
    /* the point is to have 'about:cliqz' that redirects to resource:// url */
    const fakePage = `data:text/html,
      <script>
        var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
          .getService(Components.interfaces.nsIWindowMediator);
        var w = wm.getMostRecentWindow('navigator:browser');
        var url = '${utils.CLIQZ_NEW_TAB_RESOURCE_URL}';
        w.gBrowser.addTab(url);
        window.close();
      </script>
    `;
    let channel;

    if (Services.vc.compare(Services.appinfo.version, '47.*') > 0) {
      const uri = Services.io.newURI(fakePage, null, null);
      channel = Services.io.newChannelFromURIWithLoadInfo(uri, aLoadInfo);
    } else {
      channel = Services.io.newChannel(fakePage, null, null);
    }

    channel.owner = Services.scriptSecurityManager.getSystemPrincipal();

    return channel;
  }

  getURIFlags() {
    return Components.interfaces.nsIAboutModule.ALLOW_SCRIPT;
  }
}
