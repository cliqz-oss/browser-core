import userAgent from './user-agent';

export default {
  isBootstrap: false,
  isMobile: true,
  isFirefox: false,
  isChromium: false,
  isEdge: false,
  platformName: 'mobile',
  isOnionMode: false,
};

export const appName = userAgent.appName;

export const OS = userAgent.OS;
