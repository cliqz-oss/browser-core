import { NativeModules } from 'react-native';

let userAgent = {};
if (NativeModules.IOSConstants) {
  // ios useragent format:
  // - forceTouchAvailable: bool
  // - interfaceIdiom: 'phone','tablet'
  // - isTesting: bool
  // - osVersion: e.g. '10.0'
  // - systemName: 'iOS'
  userAgent = NativeModules.IOSConstants;
} else {
  // android?
  userAgent = {
    systemName: 'android',
  }
}

export default {
  isMobile: true,
  isFirefox: false,
  isChromium: false,
  platformName: "mobile",
  userAgent,
};
