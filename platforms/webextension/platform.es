import { chrome } from './globals';

/* global navigator */

function checkUserAgent(pattern) {
  try {
    return navigator.userAgent.indexOf(pattern) !== -1;
  } catch (e) {
    return false;
  }
}

export default {
  isBootstrap: false,
  isMobile: checkUserAgent('Mobile'),
  isFirefox: checkUserAgent('Firefox'),
  isChromium: checkUserAgent('Chrome'),
  isEdge: checkUserAgent('Edge'),
  platformName: 'webextension',
  isOnionMode: false,
};

export function isPlatformAtLeastInVersion() {
  return true;
}

// TODO
export const OS = '';

export function isCliqzAtLeastInVersion() {
  // TODO
  return true;
}

export function getResourceUrl(path) {
  return chrome.runtime.getURL(`modules/${path}`);
}
