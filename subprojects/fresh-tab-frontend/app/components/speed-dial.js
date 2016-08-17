import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service(),

  click(ev) {
    this.get('cliqz').sendTelemetry({
      type: 'home',
      action: 'click',
      target_type: this.get('type'),
      target_index: this.get('index')
    });
  },
  actions: {
    remove() {
      this.sendAction("removeAction", this.get('model'));
    },

    resetAll() {
      this.sendAction("resetAllAction");
    },

    searchAlias() {
      this.get('cliqz').setUrlbar('');
      this.get('cliqz').setUrlbar(this.get('alias') + ' ');
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: this.get('type') + '_search',
        target_index: this.get('index')
      });
      return false;
    }
  }
});
