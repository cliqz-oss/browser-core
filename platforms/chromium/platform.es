/* global navigator */

export default {
  isMobile: false,
  isFirefox: false,
  isChromium: true,
  get isEdge() {
    try {
      // source: https://stackoverflow.com/a/33152824/783510
      return /Edge/.test(navigator.userAgent);
    } catch (e) {
      return false;
    }
  },
};

export function isPlatformAtLeastInVersion() {
  return true;
}

// TODO
export const OS = "";

export function isCliqzAtLeastInVersion() {
  // TODO
  return true;
}
