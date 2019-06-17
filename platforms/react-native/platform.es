import userAgent from './user-agent';

export default {
  isMobile: true,
  isFirefox: false,
  isChromium: false,
  isEdge: false,
  platformName: 'mobile',
};

export function isOnionModeFactory() {
  return () => false;
}

export const appName = userAgent.appName;

export const OS = userAgent.OS;

export function isBetaVersion() {
  return false;
}

export function getResourceUrl(path) {
  return path;
}
