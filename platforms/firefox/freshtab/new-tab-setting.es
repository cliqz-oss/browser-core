/* global NewTabURL */

import { Components, XPCOMUtils, Services } from '../globals';
import prefs from '../../core/prefs';
import config from '../../core/config';

const getNewTabService = () =>
  Components.classes['@mozilla.org/browser/aboutnewtab-service;1']
    .getService(Components.interfaces.nsIAboutNewTabService);

export function setNewTabPage(url) {
  if (Components.classes['@mozilla.org/browser/aboutnewtab-service;1']) {
    const aboutNewTabService = getNewTabService();
    aboutNewTabService.newTabURL = url;
  } else {
    Components.utils.import('resource:///modules/NewTabURL.jsm');
    NewTabURL.override(url);
  }
}

export function resetNewTabPage() {
  if (Components.classes['@mozilla.org/browser/aboutnewtab-service;1']) {
    const aboutNewTabService = getNewTabService();
    aboutNewTabService.resetNewTabURL();
  } else {
    Components.utils.import('resource:///modules/NewTabURL.jsm');
    NewTabURL.reset();
  }
}

export function setHomePage(url) {
  prefs.set('browser.startup.homepage', url, '');
}

export function getHomePage() {
  return prefs.get('browser.startup.homepage', null, '');
}

export function migrate() {
  // migrate old homepage url to new one
  if (getHomePage() === 'about:cliqz') {
    setHomePage(config.settings.NEW_TAB_URL);
  }
}

export class AboutCliqz {

  get QueryInterface() {
    return XPCOMUtils.generateQI([Components.interfaces.nsIAboutModule]);
  }

  getURIFlags() {
    return Components.interfaces.nsIAboutModule.ALLOW_SCRIPT;
  }

  newChannel(aURI, aLoadInfo) {
    /* all this is plain bad, please fix me */
    /* the point is to have 'about:cliqz' that redirects to resource:// url */
    const fakePage = `data:text/html,
      <script>
        var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
          .getService(Components.interfaces.nsIWindowMediator);
        var w = wm.getMostRecentWindow('navigator:browser');
        var url = '${config.settings.NEW_TAB_URL}';
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

  static get classID() {
    /* eslint-disable */
    return Components.ID('{D5889F72-0F01-4aee-9B88-FEACC5038C34}');
    /* eslint-enable */
  }

  static get classDescription() {
    return 'CLIQZ New Tab Page';
  }

  static get contractID() {
    return '@mozilla.org/network/protocol/about;1?what=cliqz';
  }

  static get manager() {
    return Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  }

  static register() {
    if (!this.manager.isCIDRegistered(this.classID)) {
      this.manager.registerFactory(this.classID, this.classDescription, this.contractID, this);
    }
  }

  static unregister() {
    this.manager.unregisterFactory(this.classID, this);
  }

  static createInstance(outer, iid) {
    if (outer) {
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    }

    return new AboutCliqz().QueryInterface(iid);
  }
}
