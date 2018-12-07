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
  const currentHomepage = getHomePage();
  if (
    currentHomepage === 'about:cliqz'
    // we moved from the resource url to chrome url in X.21.0
    // we moved from chrome url to https url in X.21.3 and X.22.X
    || currentHomepage === 'chrome://cliqz/content/freshtab/home.html'
    || currentHomepage === 'resource://cliqz/freshtab/home.html'
    || currentHomepage.indexOf('chrome://branding/locale/browserconfig.properties') !== -1
  ) {
    prefs.clear('browser.startup.homepage', '');
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
        var securityManager = Components.classes['@mozilla.org/scriptsecuritymanager;1']
          .getService(Components.interfaces.nsIScriptSecurityManager);
        var w = wm.getMostRecentWindow('navigator:browser');
        var url = '${config.settings.NEW_TAB_URL}';
        w.gBrowser.addTab(url, {
          triggeringPrincipal: securityManager.getSystemPrincipal(),
        });
        window.close();
      </script>
    `;

    const uri = Services.io.newURI(fakePage, null, null);
    const channel = Services.io.newChannelFromURIWithLoadInfo(uri, aLoadInfo);

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
