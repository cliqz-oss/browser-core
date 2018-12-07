export default {
  or(v1, v2) {
    return v1 || v2;
  },

  not(value) {
    return !value;
  },

  local(key) {
    return key ? chrome.i18n.getMessage(key) : '';
  },

  truncate(text, maxChars) {
    const dots = '...';
    let str = text.trim();
    const limit = maxChars;
    if (str.length > limit) {
      str = str.substring(0, limit);
      str = str.substr(0, Math.min(str.length, str.lastIndexOf(' '))) + dots;
    }
    return str;
  }
};
