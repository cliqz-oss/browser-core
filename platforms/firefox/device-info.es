import config from '../core/config';

const appInfo = Components.classes['@mozilla.org/xre/app-info;1']
  .getService(Components.interfaces.nsIXULAppInfo);
const ua = Cc['@mozilla.org/network/protocol;1?name=http']
  .getService(Ci.nsIHttpProtocolHandler).userAgent;

function getDeviceName() {
  return config.settings.channel === '40' ? 'Cliqz Desktop Browser' : `Firefox ${appInfo.version}`;
}

function getUserAgent() {
  return ua;
}

export { getDeviceName, getUserAgent };
