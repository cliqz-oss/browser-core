import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service(),

  classNames: ['searchAlias'],

  attributeBindings: ['style'],

  click() {
    this.get('cliqz').queryCliqz(this.get('alias') + ' ');
    this.get('cliqz').sendTelemetry({
      type: 'home',
      action: 'click',
      target_type: this.get('type') + '_search',
      target_index: this.get('index')
    });
    return false;
  },

  style: Ember.computed('model.logo.backgroundColor', function () {
    const color = this.get('model.logo.backgroundColor');
    return Ember.String.htmlSafe(`background: #${color};`);
  }),
});
