// TODO: Resolve locale on iOS
const defaultLocale = 'de';

export default {

  lang: 'en',

  state: function() {
    return ['de', 'en'];
  },
  stateToQueryString() {
    return '&lang=' + this.lang;
  }
};
