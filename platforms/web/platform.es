import window from './window';

function checkUserAgent(pattern = '') {
  return window.navigator.userAgent.toLowerCase().indexOf(pattern.toLowerCase()) !== -1;
}

export default {
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

export const OS = {
  // TODO
};

export function getResourceUrl() {}

export function isBetaVersion() {
  return false;
}
