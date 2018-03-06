/* global XPCOMUtils */

import Signals from './signals';
import { Components } from '../platform/globals';

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

      newChannel(uri) {
        const ioService = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
        const html = ['data:text/html,<!DOCTYPE html><html><head><meta charset=\'UTF-8\'>',
          '<style>* {margin:0;padding:0;width:100%;height:100%;overflow:hidden;border: 0}</style>',
          '</head><body><iframe src=\'chrome://cliqz/content/privacy-dashboard/index.html\'></iframe></body></html>'].join('');

        const securityManager = Components.classes['@mozilla.org/scriptsecuritymanager;1'].getService(Components.interfaces.nsIScriptSecurityManager);
        const channel = ioService.newChannel(html, null, null);
        channel.originalURI = uri;
        channel.owner = securityManager.getSystemPrincipal();

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
