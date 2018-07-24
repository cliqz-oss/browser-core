if (!window.chrome) {
  window.chrome = {};
}

if (!window.chrome.i18n) {
  window.chrome.i18n = {
    getMessage(k) { return k; }
  };
}
