import { Platform, NativeModules } from 'react-native';
import { getPref } from './prefs';

export function getUserAgent() {
  if (Platform.OS === 'ios') {
    // Because `core/demographics` expect a normal user agent, we fake one using
    // the values of Platform.OS and Platform.Version. It will be converted into
    // something like: { name: 'iOS', version: '9.3.5' }
    return Promise.resolve(`iPhone OS ${Platform.Version.replace(/[.]/g, '_')} like Mac OS X`);
  }

  return Promise.resolve(`android ${Platform.Version}`);
}

export function getDistribution() {
  // On mobile `distribution` is not set, and we only make use of `channel`.
  return Promise.resolve('');
}

export function getInstallDate() {
  return Promise.resolve(getPref('install_date', ''));
}

export function getChannel() {
  return Promise.resolve(NativeModules.UserAgentConstants.channel);
}
