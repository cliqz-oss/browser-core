import config from '../core/config';
import { Components } from './globals';

const appInfo = Components.classes['@mozilla.org/xre/app-info;1']
  .getService(Components.interfaces.nsIXULAppInfo);
const ua = Components.classes['@mozilla.org/network/protocol;1?name=http']
  .getService(Components.interfaces.nsIHttpProtocolHandler).userAgent;

function getDeviceName() {
  return config.settings.channel === '40' ? 'Cliqz Desktop Browser' : `Firefox ${appInfo.version}`;
}

function getUserAgent() {
  return ua;
}

export { getDeviceName, getUserAgent };
