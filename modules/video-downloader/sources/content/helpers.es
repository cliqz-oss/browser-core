export default {
  json(context) {
    return JSON.stringify(context);
  },

  local(key) {
    return chrome.i18n.getMessage(key)
  },

  if_eq(a, b, opts) {
    if(a === b)
      return opts.fn(this);
    else
      return opts.inverse(this);
  }
}
