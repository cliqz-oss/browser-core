import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service(),

  actions: {
    openLink(url, target) {
      this.sendAction("openLinkAction", url, target)
    },

    close() {
      this.sendAction("closeModalAction");
    },

    navigateTo(screenId, fromDots=false) {
      Ember.$('.screen').addClass('hidden');
      Ember.$(`#screen${screenId}`).removeClass('hidden');

      if(screenId === 3) {
        this.sendAction("toggleBackgroundAction");
      }

      this.get('cliqz').sendTelemetry({
        type: "onboarding",
        product: "cliqz",
        action: "click",
        action_target: fromDots ? "pagination-dots" : "confirm",
        action_index: fromDots ? screenId - 1 : screenId - 2,
        version: "2.0"
      });
    },

  },
});
