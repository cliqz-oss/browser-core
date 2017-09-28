import { NativeModules } from 'react-native';
const { localeIdentifier } = NativeModules.I18nManager;

// TODO: Resolve locale on iOS
const defaultLocale = 'de';

export default {

  lang: localeIdentifier ? localeIdentifier.substr(0, 2) : defaultLocale,

  state: function() {
    return ['de', 'en'];
  },
  stateToQueryString() {
    return '&lang=' + this.lang;
  }
};