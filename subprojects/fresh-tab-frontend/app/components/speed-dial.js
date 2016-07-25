import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service(),

  click() {
    this.get('cliqz').sendTelemetry({
      type: 'home',
      action: 'click',
      target_type: this.get('type'),
      target_index: this.get('index')
    });
  },
  actions: {
    remove() {
      this.sendAction("removeAction", this.get('model'), this.get('type'), this.get('index'));
    }
  }
});
