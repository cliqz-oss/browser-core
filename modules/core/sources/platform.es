import config from './config';

import platform, * as platformAll from '../platform/platform';

const { OS } = platformAll;

export {
  getResourceUrl
} from '../platform/platform';

export function notImplemented() {
  throw new Error('Not implemented');
}

const { channel = '' } = config.settings;

export const isFirefox = platform.isFirefox;
export const isMobile = platform.isMobile || Boolean(config.isMobile);
export const isChromium = platform.isChromium;
export const isEdge = platform.isEdge;
export const platformName = platform.platformName;
export const isCliqzBrowser = channel === '40' || channel === '99';
export const isGhosteryExtension = channel.startsWith('CH');
export const isGhosteryBrowser = channel.startsWith('GB');
export const isGhosteryTab = channel.startsWith('GT');
export const isDesktopBrowser = isCliqzBrowser || isGhosteryBrowser;
export const isAMO = channel === '04';
export const isOnionModeFactory = platformAll.isOnionModeFactory || (() => (() => false));
export const isWebExtension = platformName === 'webextension';
export const isGhostery = isGhosteryBrowser || isGhosteryTab || isGhosteryExtension;
export const product = isGhostery ? 'GHOSTERY' : 'CLIQZ';

export function isWindows() {
  return OS && OS.indexOf('win') === 0;
}

export function isMac() {
  return OS && OS.indexOf('darwin') === 0;
}

export function isLinux() {
  return OS && OS.indexOf('linux') === 0;
}
