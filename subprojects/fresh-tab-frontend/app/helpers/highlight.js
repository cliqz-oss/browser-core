import Ember from 'ember';

export function highlight([text, em]) {
  if (!em) {
    return text;
  }
  const re = new RegExp(em, 'gi');
  const highlighted = text.replace(re, function (match) {
    return `<em>${match}</em>`;
  });
  return Ember.String.htmlSafe(highlighted)
}

export default Ember.Helper.helper(highlight);
