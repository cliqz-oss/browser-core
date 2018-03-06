import window from './window';

export default {
  isMobile: true,
  isFirefox: false,
  isChromium: false,
  isEdge: false,
  platformName: 'mobile',
};

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
