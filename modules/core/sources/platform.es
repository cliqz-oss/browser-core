import config from './config';

import platform, {
  OS,
  OS_VERSION,
} from '../platform/platform';

export {
  isPlatformAtLeastInVersion
} from '../platform/platform';

export function notImplemented() {
  throw new Error('Not implemented');
}

export let isFirefox = platform.isFirefox;
export let isMobile = platform.isMobile;
export let isChromium = platform.isChromium;
export let platformName = platform.platformName;
export let isCliqzBrowser = config.settings.channel === "40";

export function isWindows () {
  return OS && OS.indexOf('win') === 0;
};
export function isMac() {
  return OS && OS.indexOf('darwin') === 0;
};
export function isLinux() {
  return OS && OS.indexOf('linux') === 0;
};
