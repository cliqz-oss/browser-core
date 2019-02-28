export default {
  isMobile: false,
  isFirefox: false,
  isChromium: false,
  isEdge: false,
  platformName: 'node',
};

export function isWindows() {
  return false;
}

export function isLinux() {
  return false;
}

export function isMac() {
  return false;
}

export function isMobile() {
  return false;
}

export function isBetaVersion() {
  return false;
}

export function isOnionModeFactory() {
  return () => false;
}
