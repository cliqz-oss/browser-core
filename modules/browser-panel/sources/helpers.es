export default {
  or(v1, v2) {
    return v1 || v2;
  },

  not(value) {
    return !value;
  },

  local(key) {
    return chrome.i18n.getMessage(key);
  }
};

