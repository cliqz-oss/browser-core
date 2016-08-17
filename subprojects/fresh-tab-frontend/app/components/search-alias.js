import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service(),

  click() {
    this.get('cliqz').setUrlbar(this.get('alias') + ' ');
    this.get('cliqz').sendTelemetry({
      type: 'home',
      action: 'click',
      target_type: this.get('type') + '_search',
      target_index: this.get('index')
    });
    return false;
  }
});
