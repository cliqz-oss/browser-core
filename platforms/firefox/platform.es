import { Components, Services } from './globals';
import { getPref } from './prefs';

const { classes: Cc, interfaces: Ci } = (Components || {});

const env = Cc && Cc['@mozilla.org/process/environment;1'].getService(Ci.nsIEnvironment);

// Directly exporting this was breaking process-script bundle.
const def = {
  isBootstrap: true,
  isMobile: false,
  isFirefox: true,
  isChromium: false,
  isEdge: false,
  platformName: 'firefox',
};

export default def;

export function isOnionModeFactory() {
  return () => !!(env && env.get('MOZ_CLIQZ_PRIVATE_MODE'));
}

let appInfo;
let versionChecker;
let _OS;
let _OS_VERSION;

try {
  appInfo = Components.classes['@mozilla.org/xre/app-info;1'];

  versionChecker = Components.classes['@mozilla.org/xpcom/version-comparator;1']
    .getService(Components.interfaces.nsIVersionComparator);

  _OS = appInfo
    .getService(Components.interfaces.nsIXULRuntime)
    .OS.toLowerCase();

  _OS_VERSION = Services.sysinfo.getProperty('version');
} catch (e) {
  //
}


export function isPlatformAtLeastInVersion(minVersion) {
  const hostVersion = appInfo.getService(Components.interfaces.nsIXULAppInfo).version;
  return versionChecker.compare(hostVersion, minVersion) >= 0;
}

export const OS = _OS;
export const OS_VERSION = _OS_VERSION;

export function isCliqzAtLeastInVersion(minVersion) {
  const cliqzVersion = getPref('distribution.version', '', '');
  return versionChecker.compare(cliqzVersion, minVersion) >= 0;
}

export function getResourceUrl(path) {
  return `resource://cliqz/${path}`;
}

export function isBetaVersion() {
  return false;
}
