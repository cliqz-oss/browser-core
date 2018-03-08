import { Components, Services } from './globals';
import prefs from '../core/prefs';

export default {
  isMobile: false,
  isFirefox: true,
  isChromium: false,
  platformName: 'firefox',
};

const appInfo = Components.classes['@mozilla.org/xre/app-info;1'];
const versionChecker = Components.classes['@mozilla.org/xpcom/version-comparator;1']
  .getService(Components.interfaces.nsIVersionComparator);

export function isPlatformAtLeastInVersion(minVersion) {
  const hostVersion = appInfo.getService(Components.interfaces.nsIXULAppInfo).version;
  return versionChecker.compare(hostVersion, minVersion) >= 0;
}

export const OS = appInfo
  .getService(Components.interfaces.nsIXULRuntime)
  .OS.toLowerCase();
export const OS_VERSION = Services.sysinfo.getProperty('version');

export function isCliqzAtLeastInVersion(minVersion) {
  const cliqzVersion = prefs.get('distribution.version', '', '');
  return versionChecker.compare(cliqzVersion, minVersion) >= 0;
}
