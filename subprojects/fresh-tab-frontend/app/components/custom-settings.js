import Ember from 'ember';
export default Ember.Component.extend({
  cliqz: Ember.inject.service('cliqz'),

  actions: {
    openFeedbackPage() {
      this.get('cliqz').openFeedbackPage().then(() => {
        this.get('cliqz').sendTelemetry({
          type: 'home_settings',
          action: 'click',
          target: 'feedback'
        });
      });
    },

    showPanel() {
      this.toggleProperty('showPanel');
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target: 'settings'
      });
    }
  }
});
