//TODO: get from native
// NativeModules.I18nManager.localeIdentifier

export default {
  state: function() {
    return ['de', 'en'];
  },
  stateToQueryString() {
    return '&lang=en';
  }
};
