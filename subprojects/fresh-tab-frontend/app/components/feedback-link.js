import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service('cliqz'),

  actions: {
    openFeedbackPage() {
      this.get('cliqz').getFeedbackPage().then((url) => {
        this.get('cliqz').sendTelemetry({
          type: 'home',
          action: 'click',
          target_type: 'feedback'
        });
        window.open(url,'_blank');
      });

    }
  }
});
