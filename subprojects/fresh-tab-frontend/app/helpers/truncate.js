import Ember from 'ember';

export function truncate(params) {
  var dots = '...',
      str = params[0].trim(),
      limit = params[1];
  if (str.length > limit) {
    str = str.substring(0, limit);
    str = str.substr(0, Math.min(str.length, str.lastIndexOf(" "))) + dots;
  }

  return str;
}

export default Ember.Helper.helper(truncate);

