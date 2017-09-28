import window from './window';

export default {
  isMobile: true,
  isFirefox: false,
  isChromium: false,
  platformName: "mobile",
};

const userAgent = window.navigator.userAgent.toLowerCase();
export const mobilePlatformName = /iphone|ipod|ipad/.test(userAgent) ? 'ios' : 'android';