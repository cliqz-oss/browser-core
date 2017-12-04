import { Platform, NativeModules } from 'react-native';

const ua = {
  OS: Platform.OS,
  Version: Platform.Version,
  isTesting: Platform.isTesting,
  formFactor: Platform.isPad ? 'Tablet' : 'Phone',
  channel: undefined,
};

if (NativeModules.UserAgentConstants) {
  if (NativeModules.UserAgentConstants.isTablet) {
    ua.formFactor = 'Tablet';
  }
  ua.channel = NativeModules.UserAgentConstants.channel;
  ua.appVersion = NativeModules.UserAgentConstants.appVersion;
}

export default ua;
