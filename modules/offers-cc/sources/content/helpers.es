import { chrome } from '../../platform/content/globals';

function isArray(arr) {
  return (Array.isArray && Array.isArray(arr)) || (arr instanceof Array);
}
export default {
  json(context) {
    return JSON.stringify(context);
  },

  local(key) {
    return chrome.i18n.getMessage(key);
  },

  if_eq(a, b, opts) {
    if (a === b) {
      return opts.fn(this);
    }

    return opts.inverse(this);
  },

  either_or(a, b) {
    if (a) {
      return a;
    }

    return b;
  },

  limit(arr, limit) {
    if (!isArray(arr)) {
      return [];
    }
    return arr.slice(0, limit);
  }
};
