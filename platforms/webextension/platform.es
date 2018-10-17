import { chrome, window } from './globals';

/* global navigator */

function checkUserAgent(pattern) {
  try {
    return navigator.userAgent.indexOf(pattern) !== -1;
  } catch (e) {
    return false;
  }
}

const def = {
  isBootstrap: false,
  isMobile: checkUserAgent('Mobile'),
  isFirefox: checkUserAgent('Firefox'),
  isChromium: checkUserAgent('Chrome'),
  isEdge: checkUserAgent('Edge'),
  platformName: 'webextension',
  isOnionMode: false,
};

export default def;

export function isPlatformAtLeastInVersion() {
  return true;
}

// this should differentiate between cliqz and ghostery apps for mobile
export const appName = chrome.cliqzAppConstants ?
  chrome.cliqzAppConstants.get('MOZ_APP_NAME') : window.navigator.appName;

export const OS = chrome.cliqzAppConstants ?
  chrome.cliqzAppConstants.get('platform') : window.navigator.platform;

export function isCliqzAtLeastInVersion() {
  // TODO
  return true;
}

export function getResourceUrl(path) {
  return chrome.runtime.getURL(`modules/${path}`);
}
