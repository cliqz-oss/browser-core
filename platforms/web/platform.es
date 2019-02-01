import window from './window';

function checkUserAgent(pattern = '') {
  return window.navigator.userAgent.toLowerCase().indexOf(pattern.toLowerCase()) !== -1;
}

export default {
  isBootstrap: false,
  isMobile: checkUserAgent('Mobile'),
  isFirefox: false,
  isChromium: false,
  isEdge: false,
  platformName: 'mobile',
};

export function isOnionModeFactory() {
  return () => false;
}

const userAgent = window.navigator.userAgent.toLowerCase();
export const mobilePlatformName = /iphone|ipod|ipad/.test(userAgent) ? 'ios' : 'android';

export function isPlatformAtLeastInVersion() {
  return true;
}

export const OS = {
  // TODO
};

export function isCliqzAtLeastInVersion() {
  // TODO
  return true;
}

export function getResourceUrl() {}

export function isBetaVersion() {
  return false;
}
