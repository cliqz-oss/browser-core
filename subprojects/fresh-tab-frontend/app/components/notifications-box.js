import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service('cliqz'),

  actions: {
    close() {
      this.$().closest('#notificationsBox').fadeOut();
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'close_new_brand_notification'
      });

      this.get('cliqz').dismissAlert();
    },

    openNewBrandPage(url) {

      this.get('cliqz').dismissAlert();

      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'learn_more_new_brand_notification'
      });
      window.open(url,'_blank');
    }
  }
});
