import { NativeModules } from 'react-native';
import config from '../core/config';

let userAgent = {};
if (NativeModules.PlatformConstants && NativeModules.PlatformConstants.systemName) {
  // ios useragent format:
  // - forceTouchAvailable: bool
  // - interfaceIdiom: 'phone','tablet'
  // - isTesting: bool
  // - osVersion: e.g. '10.0'
  // - systemName: 'iOS'
  userAgent = NativeModules.PlatformConstants;
} else {
  // android?
  userAgent = {
    systemName: 'android',
  };
}

export default {
  isMobile: true,
  isFirefox: false,
  isChromium: false,
  platformName: 'mobile',
  userAgent,
  channel: config.settings.channel,
};
