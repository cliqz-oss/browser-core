import Ember from 'ember';

export function highlight([text, em]) {
  if (!em) {
    return text;
  }

  var safeText = Ember.Handlebars.Utils.escapeExpression(text || '');
  const re = new RegExp(em, 'gi');
  const highlighted = safeText.replace(re, function (match) {
    return `<em>${match}</em>`;
  });
  return Ember.String.htmlSafe(highlighted)
}

export default Ember.Helper.helper(highlight);
