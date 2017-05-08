import { Components } from './globals';

export default {
  isMobile: false,
  isFirefox: true,
  isChromium: false,
  platformName: "firefox",
};

export function isPlatformAtLeastInVersion(version) {
  const appInfo = Components.classes['@mozilla.org/xre/app-info;1']
    .getService(Components.interfaces.nsIXULAppInfo);
  const versionChecker = Components.classes['@mozilla.org/xpcom/version-comparator;1']
    .getService(Components.interfaces.nsIVersionComparator);

  return versionChecker.compare(appInfo.version, version) >= 0;
}
