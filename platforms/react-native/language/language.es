import { NativeModules } from 'react-native';

const LocaleConstants = NativeModules.LocaleConstants;
const defaultLocale = 'en';

export default {

  lang: LocaleConstants ? LocaleConstants.lang : defaultLocale,

  state() {
    return ['de', 'en'];
  },
  stateToQueryString() {
    return `&lang=${this.lang}`;
  }
};
