import Ember from 'ember';

export function url(url) {
  // remove protocol
  return url.toString().replace(/.*?:\/\//g, "");
}

export default Ember.Helper.helper(url);
