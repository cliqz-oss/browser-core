import Ember from 'ember';

export default Ember.Component.extend({
  classNames: ['logo'],

  attributeBindings: ['style', 'extra'],

  style: Ember.computed('model.style', function () {
    const style = this.get('model.style');
    return new Ember.Handlebars.SafeString(style);
  }),

  extra: 'logo',
});
