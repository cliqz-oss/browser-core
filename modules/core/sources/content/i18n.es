/* global chrome */
export default {
  getMessage(key, ...subs) {
    let substitutions = [];
    // Firefox accepts number as substitutions but chrome does not
    if (Array.isArray(subs[0])) {
      substitutions = subs[0].map(String);
    } else {
      substitutions = subs.map(String);
    }
    return chrome.i18n.getMessage(key, substitutions) || key;
  },
};
